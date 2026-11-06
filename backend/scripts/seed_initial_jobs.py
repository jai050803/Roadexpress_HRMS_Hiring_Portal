import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.job_role import JobRole
from app.services.jobs.service import JobsService

INITIAL_JOBS = [
    {
        "title": "Senior Accounts Lead",
        "department": "Accounts & Finance",
        "employment_type": "full_time",
        "location": "Mumbai, Maharashtra",
        "work_mode": "onsite",
        "min_experience_years": 5,
        "required_skills": ["Financial Reporting", "Tally Prime", "GST & Direct Tax", "Vendor Reconciliation"],
        "responsibilities_text": "Lead company accounts reconciliations, audit readiness, monthly closing, and cash-flow forecasting.",
        "salary_band": "INR 12,00,000 - 16,00,000 PA",
        "status": "published",
    },
    {
        "title": "Supply Chain Operations Lead",
        "department": "Logistics & Supply Chain",
        "employment_type": "full_time",
        "location": "Bangalore, Karnataka",
        "work_mode": "hybrid",
        "min_experience_years": 4,
        "required_skills": ["Supply Chain Optimization", "Vendor Management", "SLA Monitoring", "Inventory Planning"],
        "responsibilities_text": "Drive multi-hub logistics coordination, carrier vendor performance, and regional transit time reduction.",
        "salary_band": "INR 10,00,000 - 14,00,000 PA",
        "status": "published",
    },
    {
        "title": "Senior Data Analyst - Logistics & Supply Chain",
        "department": "Supply Chain Analytics",
        "employment_type": "full_time",
        "location": "Bangalore, Karnataka",
        "work_mode": "hybrid",
        "min_experience_years": 3,
        "required_skills": ["Python", "SQL", "Tableau", "Route Optimization", "Forecasting"],
        "responsibilities_text": "Build live dispatch and delivery performance dashboards, forecast freight volumes, and analyze bottleneck corridors.",
        "salary_band": "INR 11,00,000 - 15,00,000 PA",
        "status": "published",
    },
    {
        "title": "Lead Logistics Systems Engineer",
        "department": "Engineering & Technology",
        "employment_type": "full_time",
        "location": "Remote / Bangalore",
        "work_mode": "remote",
        "min_experience_years": 5,
        "required_skills": ["FastAPI", "PostgreSQL", "Kafka", "Redis", "Distributed Systems"],
        "responsibilities_text": "Architect high-throughput tracking pipelines, automated routing algorithms, and core microservices.",
        "salary_band": "INR 20,00,000 - 28,00,000 PA",
        "status": "published",
    },
    {
        "title": "Operations Team Lead",
        "department": "Operations",
        "employment_type": "full_time",
        "location": "Delhi NCR",
        "work_mode": "onsite",
        "min_experience_years": 4,
        "required_skills": ["Hub Operations", "Team Leadership", "Cross-Dock Coordination", "Incident Escalation"],
        "responsibilities_text": "Lead hub dispatch shifts, ensure 99.5% on-time milestone departures, and manage day-to-day operations personnel.",
        "salary_band": "INR 8,00,000 - 11,00,000 PA",
        "status": "published",
    },
]


async def seed_jobs():
    async with AsyncSessionLocal() as session:
        # Check if published jobs already exist
        stmt = select(JobRole).where(JobRole.status == "published")
        res = await session.execute(stmt)
        existing = res.scalars().all()
        if existing:
            print(f"Published jobs already exist ({len(existing)} found). Skipping seed.")
            return

        print("Seeding initial corporate job roles...")
        now = datetime.now(timezone.utc)
        for job_data in INITIAL_JOBS:
            role = JobRole(
                id=uuid.uuid4(),
                title=job_data["title"],
                department=job_data["department"],
                employment_type=job_data["employment_type"],
                location=job_data["location"],
                work_mode=job_data["work_mode"],
                min_experience_years=job_data["min_experience_years"],
                required_skills=job_data["required_skills"],
                responsibilities_text=job_data["responsibilities_text"],
                salary_band=job_data["salary_band"],
                status=job_data["status"],
                applications_count=0,
                created_at=now,
                updated_at=now,
            )
            role.jd_text = JobsService.generate_jd_text(role)
            role.linkedin_post_copy = JobsService.generate_linkedin_copy(role)
            session.add(role)

        await session.commit()
        print(f"Successfully seeded {len(INITIAL_JOBS)} published corporate job roles!")


if __name__ == "__main__":
    asyncio.run(seed_jobs())
