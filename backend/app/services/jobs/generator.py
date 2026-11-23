"""
Framework-driven Job Description & LinkedIn Post Generation Engine.
Road Express Freight HRMS  -  Pure programmatic / rule-based framework (No AI).

Follows:
1. Executive JD Framework: Structured metadata, company mission, role purpose,
   responsibilities, competencies, qualification criteria, and EVP.
2. LinkedIn Executive Talent Hook Framework: Headline, scale narrative, role snapshot,
   in-post responsibilities & skills breakdown, EVP, and direct apply link.
Strict compliance:
- Omit any section whose data is null or empty.
- Never output "N/A" or "None".
- Never include emojis or hashtag symbols (#) in LinkedIn post copy.
- Always include 'Apply here: {portal_url}/jobs/{id}' in LinkedIn post copy.
"""

from typing import List, Optional
import uuid


def clean_str(val: Optional[str]) -> Optional[str]:
    """Helper to strip whitespace and return None if empty."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def format_bullet_points(raw_text: str) -> List[str]:
    """Parse multiline or delimiter-separated text into clean bullet points."""
    lines = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Strip leading dashes, bullets, numbers
        if line.startswith(("-", "*", "•")):
            line = line.lstrip("-*• ").strip()
        elif len(line) > 2 and line[0].isdigit() and line[1] in (".", ")", " "):
            line = line[2:].strip()
        elif len(line) > 3 and line[:2].isdigit() and line[2] in (".", ")", " "):
            line = line[3:].strip()
        if line:
            lines.append(f"- {line}")
    if not lines and raw_text.strip():
        lines.append(f"- {raw_text.strip()}")
    return lines


def generate_jd_text(
    title: str,
    department: str,
    employment_type: Optional[str] = None,
    location: Optional[str] = None,
    work_mode: Optional[str] = None,
    education_qualification: Optional[str] = None,
    min_experience_years: Optional[int] = None,
    required_skills: Optional[List[str]] = None,
    responsibilities_text: Optional[str] = None,
    salary_band: Optional[str] = None,
) -> str:
    """
    Generate a formatted, executive-grade Job Description.
    Rule: Omit any section whose data field is null/empty.
    Never print "N/A" or placeholder text.
    """
    clean_title = clean_str(title) or "Job Title"
    clean_dept = clean_str(department) or "Operations"
    clean_loc = clean_str(location)
    clean_mode = clean_str(work_mode)
    clean_emp = clean_str(employment_type)
    clean_sal = clean_str(salary_band)
    clean_resp = clean_str(responsibilities_text)
    clean_edu = clean_str(education_qualification)

    sections: List[str] = []

    # 1. Header
    sections.append(f"# {clean_title}\n**Department:** {clean_dept}")

    # 2. Metadata overview
    meta_items: List[str] = []
    if clean_loc:
        meta_items.append(f"**Location:** {clean_loc}")
    if clean_mode:
        meta_items.append(f"**Work Mode:** {clean_mode.capitalize()}")
    if clean_emp:
        formatted_emp = clean_emp.replace("_", " ").title()
        meta_items.append(f"**Employment Type:** {formatted_emp}")
    if clean_sal:
        meta_items.append(f"**Salary Band:** {clean_sal}")

    if meta_items:
        sections.append("\n".join(meta_items))

    # 3. About Company & Role Mission
    about_lines = [
        "### About Road Express Freight",
        "Road Express Freight is India's premier tech-enabled surface freight and linehaul logistics network. Operating across 500+ commercial hubs with a 99.4% on-time linehaul SLA and moving over 12,000 metric tonnes daily, we build mission-critical logistics software, supply chain infrastructure, and operational discipline that power the nation's commerce.",
        "",
        f"In this role, you will collaborate with cross-functional leaders across engineering, hub operations, and freight management to deliver high-velocity, reliable outcomes."
    ]
    sections.append("\n".join(about_lines))

    # 4. Responsibilities (omitted if empty)
    if clean_resp:
        bullets = format_bullet_points(clean_resp)
        sections.append("### Responsibilities\n" + "\n".join(bullets))

    # 5. Required Skills (omitted if empty)
    if required_skills:
        clean_skills = [s.strip() for s in required_skills if s and s.strip()]
        if clean_skills:
            bullets = [f"- {s}" for s in clean_skills]
            sections.append("### Required Skills\n" + "\n".join(bullets))

    # 6. Qualifications & Experience (omitted if empty)
    qual_items: List[str] = []
    if min_experience_years is not None and min_experience_years > 0:
        qual_items.append(f"- Minimum {min_experience_years} year(s) of relevant experience")
    if clean_edu:
        qual_items.append(f"- Education: {clean_edu}")

    if qual_items:
        qual_items.append("- Demonstrated problem-solving aptitude, operational discipline, and comfort in fast-paced logistics environments.")
        sections.append("### Qualifications & Experience\n" + "\n".join(qual_items))

    # 7. What We Offer & Meritocracy Commitment
    culture_lines = [
        "### Life at Road Express Freight",
        "- Direct ownership of mission-critical systems and processes that move India's supply chain.",
        "- High-velocity, meritocratic environment with clear performance recognition.",
        "- Fast-track application review and interview feedback.",
        "",
        "Road Express Freight is an equal opportunity employer committed to merit, operational integrity, and professional excellence."
    ]
    sections.append("\n".join(culture_lines))

    return "\n\n".join(sections)


def generate_linkedin_copy(
    title: str,
    department: str,
    portal_url: str,
    role_id: Optional[uuid.UUID] = None,
    employment_type: Optional[str] = None,
    location: Optional[str] = None,
    work_mode: Optional[str] = None,
    education_qualification: Optional[str] = None,
    min_experience_years: Optional[int] = None,
    required_skills: Optional[List[str]] = None,
    responsibilities_text: Optional[str] = None,
    salary_band: Optional[str] = None,
) -> str:
    """
    Generate an executive, high-converting LinkedIn hiring announcement.
    Adheres to the LinkedIn Executive Talent Hook Framework:
    - Formal Headline
    - Scale Context (Road Express 500+ hubs, 12,000+ daily tonnes, 99.4% SLA)
    - Role Overview & Scope
    - In-Post Role Responsibilities & Qualifications breakdown
    - Why Join Road Express Freight
    - Direct candidate portal application link: 'Apply here: {portal_url}/jobs/{id}'
    Rules:
    - Zero emojis (plain text unicode compliant).
    - Zero hashtag symbols (#).
    - Includes the full JD breakdown in the post for direct reader clarity.
    """
    clean_title = clean_str(title) or "Job Title"
    clean_dept = clean_str(department) or "Operations"
    clean_loc = clean_str(location)
    clean_mode = clean_str(work_mode)
    clean_emp = clean_str(employment_type)
    clean_sal = clean_str(salary_band)
    clean_resp = clean_str(responsibilities_text)
    clean_edu = clean_str(education_qualification)

    base_url = portal_url.rstrip("/")
    role_id_str = str(role_id) if role_id else ":id"
    apply_link = f"{base_url}/jobs/{role_id_str}"

    loc_str = f" based in {clean_loc}" if clean_loc else ""
    mode_str = f" ({clean_mode.lower()})" if clean_mode else ""
    emp_str = clean_emp.replace("_", " ").title() if clean_emp else "Full Time"

    blocks: List[str] = []

    # 1. Headline
    blocks.append(f"Hiring: {clean_title} in {clean_dept} at Road Express Freight.")

    # 2. Company Context & Role Introduction
    intro_lines = [
        f"Road Express Freight is looking for a qualified {clean_title} to join our {clean_dept} team{loc_str}{mode_str}.",
        "As India's leading tech-enabled surface freight and linehaul logistics network, Road Express moves over 12,000 metric tonnes daily across 500+ commercial hubs nationwide with a 99.4% on-time linehaul SLA.",
        f"In this role, you will play an important part in our logistics operations and supply chain commitments. Qualified candidates are invited to review the full job requirements and apply online."
    ]
    blocks.append(" ".join(intro_lines))

    # 3. Role Overview Snapshot
    meta_lines = [
        "Position Snapshot:",
        f"- Role: {clean_title}",
        f"- Department: {clean_dept}",
        f"- Employment Type: {emp_str}",
    ]
    if clean_loc or clean_mode:
        loc_display = clean_loc or "Corporate HQ"
        if clean_mode:
            loc_display += f" ({clean_mode.capitalize()})"
        meta_lines.append(f"- Location: {loc_display}")
    if clean_sal:
        meta_lines.append(f"- Compensation: {clean_sal}")
    blocks.append("\n".join(meta_lines))

    # 4. Responsibilities Included in Post (if present)
    if clean_resp:
        resp_bullets = format_bullet_points(clean_resp)
        # Limit to top 5 for clean LinkedIn readability
        top_resp = resp_bullets[:5]
        blocks.append("Key Responsibilities:\n" + "\n".join(top_resp))

    # 5. Requirements & Skills Included in Post (if present)
    req_lines: List[str] = []
    if min_experience_years is not None and min_experience_years > 0:
        req_lines.append(f"- Experience: Minimum {min_experience_years} year(s) of relevant professional experience")
    if required_skills:
        clean_skills = [s.strip() for s in required_skills if s and s.strip()]
        if clean_skills:
            req_lines.append(f"- Core Competencies: {', '.join(clean_skills)}")
    if clean_edu:
        req_lines.append(f"- Education: {clean_edu}")

    if req_lines:
        blocks.append("Candidate Profile & Qualifications:\n" + "\n".join(req_lines))

    # 6. Why Join & Direct Application CTA
    why_join = [
        "Why Join Road Express Freight:",
        "- Work on mission-critical national logistics infrastructure that powers India's commerce",
        "- High-velocity, meritocratic environment with transparent advancement pathways",
        "- Rigorous engineering, operational excellence, and collaborative leadership"
    ]
    blocks.append("\n".join(why_join))

    # 7. Apply Link (Strictly matches requirement: 'Apply here: {portal_url}/jobs/{id}')
    apply_cta = (
        "Review the complete job description and submit your application directly on our careers portal:\n\n"
        f"Apply here: {apply_link}"
    )
    blocks.append(apply_cta)

    # 8. Referral Callout
    blocks.append("Know an outstanding professional who would be a great fit? Please share this announcement or connect them with our talent team.")

    return "\n\n".join(blocks)
