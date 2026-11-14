import json
import logging
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


# ── Pydantic Schema Matching DATA_MODEL.md ────────────────────────────────────

class EducationItem(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[int] = None


class ExperienceItem(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None


class ParsedResumeSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    total_experience_years: Optional[float] = None
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)


# ── Heuristic / Regex Fallback Extractor ──────────────────────────────────────

def _extract_fallback_heuristics(text: str) -> Dict[str, Any]:
    """
    Fallback deterministic parser used when Gemini API is offline, rate-limited,
    or GEMINI_API_KEY is not configured. Extracts candidate fields using pattern matching.
    """
    # 1. Email extraction
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    email = email_match.group(0).lower() if email_match else None

    # 2. Phone extraction
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}", text)
    phone = phone_match.group(0).strip() if phone_match else None

    # 3. Name heuristic (first 1-2 non-empty lines before contact details)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    name = None
    for line in lines[:5]:
        if not re.search(r"@|\+?\d{7,}|github|linkedin|curriculum|resume", line, re.IGNORECASE):
            if len(line.split()) <= 4 and len(line) < 50:
                name = line
                break

    # 4. Common logistics & tech skills dictionary search
    known_skills = [
        "python", "fastapi", "postgresql", "redis", "docker", "celery",
        "sql", "excel", "supply chain", "logistics", "erp", "sap",
        "inventory management", "fleet management", "transportation",
        "route optimization", "data analysis", "tableau", "power bi",
        "operations management", "warehouse management", "wms", "tms",
        "financial modeling", "auditing", "taxation", "tally", "git",
        "aws", "minio", "linux", "typescript", "react", "next.js", "rest api",
        "c++", "pytorch", "tensorflow", "scikit-learn", "langchain", "ocr"
    ]
    text_lower = text.lower()
    found_skills = []
    for skill in known_skills:
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower):
            found_skills.append(skill.lower())

    # 5. Experience estimate
    exp_matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience", text_lower)
    total_exp = float(exp_matches[0]) if exp_matches else None

    # 6. Education heuristic (extract degrees from text lines)
    education_items = []
    degree_patterns = [
        r"(B\.?Tech|B\.?E\.?|Bachelor of Technology|Bachelor of Engineering|BCA|B\.?Sc|Bachelor of Science)",
        r"(M\.?Tech|M\.?E\.?|Master of Technology|MCA|M\.?Sc|MBA)",
        r"(Senior Secondary|Higher Secondary|Class XII|12th|CBSE|ICSE)",
    ]
    for line in lines:
        for deg_pat in degree_patterns:
            deg_match = re.search(deg_pat, line, re.IGNORECASE)
            if deg_match:
                deg_name = deg_match.group(0).strip()
                year_match = re.search(r"\b(19\d{2}|20\d{2})\b", line)
                year = int(year_match.group(0)) if year_match else None
                education_items.append({
                    "degree": deg_name,
                    "field": None,
                    "institution": line[:60],
                    "year": year
                })
                break

    # 7. Work experience heuristic (extract roles/companies)
    experience_items = []
    role_pattern = re.compile(
        r"(intern|internship|developer|engineer|analyst|manager|specialist|lead|consultant)",
        re.IGNORECASE
    )
    for i, line in enumerate(lines):
        if role_pattern.search(line) and len(line) < 80 and not re.search(r"@|linkedin|github", line):
            desc = " ".join(lines[i+1:i+3]) if i + 1 < len(lines) else ""
            experience_items.append({
                "title": line.strip(),
                "company": "Organization",
                "duration_months": 6,
                "description": desc[:250] if desc else None
            })
            if len(experience_items) >= 4:
                break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "total_experience_years": total_exp or (0.5 if experience_items else None),
        "education": education_items,
        "experience": experience_items,
        "skills": list(dict.fromkeys(found_skills)),
        "certifications": [],
    }


# ── Gemini Extraction ─────────────────────────────────────────────────────────

RESUME_EXTRACTION_SYSTEM_PROMPT = """You are an expert AI resume parser for Road Express, a leading logistics & supply chain corporation.
Analyze the provided raw resume text and extract structured information according to the exact schema.

Rules:
1. Extract candidate name, email, and phone accurately.
2. Calculate total_experience_years accurately from the candidate's career history.
3. Extract education history: degree, field of study, institution, graduation year (integer).
4. Extract work experience history: job title, company name, duration in months (integer), and description.
5. Extract skills as a list of strings. Every skill MUST be normalized to lowercase.
6. Extract professional certifications as a list of strings.
7. Return strictly valid JSON matching the schema. No markdown code blocks, no preamble, no commentary.
"""


def parse_resume_text_with_gemini(raw_text: str, max_retries: int = 3) -> Dict[str, Any]:
    """
    Calls Gemini API to parse raw resume text into structured JSON matching ParsedResumeSchema.
    Includes retry logic for malformed responses and falls back gracefully to deterministic parsing
    if Gemini is unconfigured or unavailable.
    """
    api_key = settings.clean_gemini_api_key
    is_dummy_key = not api_key or api_key.strip() in ("", "your-gemini-api-key", "change-me")

    if is_dummy_key:
        logger.info("GEMINI_API_KEY not configured or is placeholder; using deterministic heuristic parser.")
        return _extract_fallback_heuristics(raw_text)

    models_to_try = [
        settings.clean_gemini_model,
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
    ]
    candidate_models = list(dict.fromkeys([m for m in models_to_try if m]))

    last_error: Optional[Exception] = None
    for model_name in candidate_models:
        for attempt in range(1, max_retries + 1):
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)
                prompt = f"Extract structured resume information from the following text:\n\n{raw_text}"

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=RESUME_EXTRACTION_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        response_schema=ParsedResumeSchema,
                        temperature=0.1,
                    ),
                )

                raw_response_text = response.text or ""
                data = json.loads(raw_response_text)

                # Ensure all skills are normalized to lowercase
                if "skills" in data and isinstance(data["skills"], list):
                    data["skills"] = list(
                        dict.fromkeys(
                            [s.lower().strip() for s in data["skills"] if isinstance(s, str) and s.strip()]
                        )
                    )

                return data

            except Exception as e:
                last_error = e
                logger.warning(
                    f"Gemini resume parsing attempt {attempt}/{max_retries} with {model_name} failed: {e}. "
                )
                err_str = str(e).lower()
                if "429" in err_str or "resource_exhausted" in err_str or "not_found" in err_str or "503" in err_str:
                    logger.info(f"Model {model_name} rate-limited or unavailable; trying next candidate model...")
                    break

    logger.error(f"All Gemini models exhausted ({last_error}). Falling back to heuristic extractor.")
    fallback = _extract_fallback_heuristics(raw_text)
    return fallback
