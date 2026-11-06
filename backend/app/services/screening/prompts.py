import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


class ScreeningOutputSchema(BaseModel):
    score: int = Field(ge=0, le=100, description="Overall matching score between 0 and 100")
    matched_skills: List[str] = Field(default_factory=list, description="Skills present in both job role and resume")
    missing_skills: List[str] = Field(default_factory=list, description="Required skills absent from candidate resume")
    llm_rationale: str = Field(description="2-4 sentences explaining evaluation, strengths, and gaps")
    hard_filter_passed: bool = Field(description="Whether the candidate satisfies minimum hard qualification criteria")


SCREENING_SYSTEM_PROMPT = """You are an expert recruitment and talent screening evaluator for Road Express, a leading logistics & supply chain corporation.
Your responsibility is to objectively evaluate a candidate's structured resume against the target job role's requirements.

Evaluation Instructions:
1. Skills Analysis: Compare candidate's skills with the job role's required skills.
   - matched_skills: Array of skills that candidate clearly has (normalized to lowercase).
   - missing_skills: Array of required skills that candidate lacks (normalized to lowercase).
2. Experience Relevance: Assess depth and relevance in corporate logistics, supply chain, finance, technology, or management.
3. Scoring Criteria (Strict 0 to 100 integer):
   - 85-100: Excellent fit. Possesses virtually all required skills and strong relevant experience.
   - 70-84: Good fit. Possesses core required skills with minor gaps; capable of performing the role.
   - 50-69: Moderate fit. Has some transferable skills, but noticeable gaps in required competencies.
   - 0-49: Poor fit. Missing crucial required skills and insufficient background.
4. llm_rationale: 2 to 4 concise sentences summarizing candidate's fit, highlighting key strengths and notable gaps.
5. hard_filter_passed: Initial assessment whether candidate appears to meet baseline qualifications (this will be deterministically verified against experience years).

Output Format:
Return strictly valid JSON conforming to the schema. No markdown code fences, no extra preamble or commentary.
"""


def _generate_fallback_heuristic_screening(
    job_title: str,
    required_skills: List[str],
    min_exp_years: Optional[int],
    parsed_resume: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic rule-based screening fallback when Gemini API is offline or unconfigured.
    """
    cand_skills = [s.lower().strip() for s in parsed_resume.get("skills", []) if isinstance(s, str)]
    req_skills = [s.lower().strip() for s in (required_skills or []) if isinstance(s, str)]

    matched: List[str] = []
    missing: List[str] = []

    for req in req_skills:
        # Check if req is in candidate skills or substring match
        if any(req in cs or cs in req for cs in cand_skills):
            matched.append(req)
        else:
            missing.append(req)

    cand_exp = parsed_resume.get("total_experience_years")
    hard_filter_passed = True
    if min_exp_years is not None and min_exp_years > 0:
        if cand_exp is None or float(cand_exp) < float(min_exp_years):
            hard_filter_passed = False

    # Calculate score
    if req_skills:
        skill_ratio = len(matched) / len(req_skills)
    else:
        skill_ratio = 0.75  # Default generous base if no required skills specified

    base_score = int(skill_ratio * 70)
    if hard_filter_passed:
        base_score += 20
    if parsed_resume.get("experience"):
        base_score += 10

    score = max(0, min(100, base_score))

    cand_name = parsed_resume.get("name") or "Candidate"
    exp_str = f"{cand_exp} years" if cand_exp is not None else "undisclosed experience"
    rationale = (
        f"{cand_name} matches {len(matched)} of {len(req_skills)} required skills for {job_title} "
        f"with {exp_str}. "
        f"{'Candidate satisfies minimum experience criteria.' if hard_filter_passed else 'Candidate does not meet minimum experience criteria.'}"
    )

    return {
        "score": score,
        "matched_skills": list(dict.fromkeys(matched)),
        "missing_skills": list(dict.fromkeys(missing)),
        "llm_rationale": rationale,
        "hard_filter_passed": hard_filter_passed,
    }


def call_gemini_screening(
    job_title: str,
    department: str,
    required_skills: List[str],
    min_experience_years: Optional[int],
    jd_text: Optional[str],
    responsibilities_text: Optional[str],
    parsed_resume: Dict[str, Any],
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Evaluates parsed resume against job role using Gemini API.
    Retries up to max_retries on transient or schema validation failures.
    Falls back to deterministic evaluation if GEMINI_API_KEY is not set.
    """
    api_key = settings.GEMINI_API_KEY
    is_dummy_key = not api_key or api_key.strip() in ("", "your-gemini-api-key", "change-me")

    if is_dummy_key:
        logger.info("GEMINI_API_KEY not configured or placeholder; running deterministic rule-based screening.")
        return _generate_fallback_heuristic_screening(
            job_title=job_title,
            required_skills=required_skills,
            min_exp_years=min_experience_years,
            parsed_resume=parsed_resume,
        )

    prompt_data = {
        "job_role": {
            "title": job_title,
            "department": department,
            "required_skills": required_skills or [],
            "min_experience_years": min_experience_years,
            "responsibilities": responsibilities_text or "",
            "jd_text": jd_text or "",
        },
        "candidate_resume": parsed_resume,
    }

    user_content = f"Evaluate this candidate application against the target role:\n\n{json.dumps(prompt_data, indent=2)}"

    last_error: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL or "gemini-1.5-flash",
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=SCREENING_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ScreeningOutputSchema,
                    temperature=0.1,
                ),
            )

            raw_text = response.text or ""
            data = json.loads(raw_text)

            # Validate schema
            validated = ScreeningOutputSchema(**data)
            return validated.model_dump()

        except Exception as e:
            last_error = e
            logger.warning(
                f"Gemini screening attempt {attempt}/{max_retries} failed: {e}. "
                f"{'Retrying...' if attempt < max_retries else 'All retries exhausted.'}"
            )

    logger.error(f"Gemini screening failed after {max_retries} retries ({last_error}). Triggering required fallback result.")
    # Per constraint:
    # "if validation fails after 3 retries, write score = 0, hard_filter_passed = false, llm_rationale = 'Screening failed — manual review required' and still transition to SCREENED"
    return {
        "score": 0,
        "matched_skills": [],
        "missing_skills": [s.lower().strip() for s in (required_skills or [])],
        "llm_rationale": "Screening failed — manual review required",
        "hard_filter_passed": False,
    }
