#!/usr/bin/env python3
"""
Seed script to create or update the first HR Admin user in Road Express HRMS.
Usage:
    python scripts/create_admin.py
    python scripts/create_admin.py --name "Admin User" --email "admin@roadexpress.com" --password "AdminPass123!"
"""

import argparse
import asyncio
import getpass
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.hr_user import HRUser
from app.services.auth import auth_service


async def create_or_update_admin(name: str, email: str, password: str) -> None:
    email_clean = email.strip().lower()
    hashed_password = auth_service.hash_password(password)

    async with AsyncSessionLocal() as session:
        stmt = select(HRUser).where(HRUser.email == email_clean)
        result = await session.execute(stmt)
        user = result.scalars().first()

        if user:
            print(f"Updating existing user with email: {email_clean}")
            user.name = name
            user.password_hash = hashed_password
            user.role = "admin"
            user.is_active = True
            await session.commit()
            print(f"Successfully updated admin user: {user.email} (id={user.id}, role=admin)")
        else:
            print(f"Creating new admin user with email: {email_clean}")
            new_user = HRUser(
                name=name,
                email=email_clean,
                password_hash=hashed_password,
                role="admin",
                is_active=True,
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            print(f"Successfully created admin user: {new_user.email} (id={new_user.id}, role=admin)")


def main():
    parser = argparse.ArgumentParser(description="Create HR Admin user for Road Express HRMS")
    parser.add_argument("--name", type=str, default=None, help="Full name of the admin user")
    parser.add_argument("--email", type=str, default=None, help="Email address")
    parser.add_argument("--password", type=str, default=None, help="Password for the admin user")
    args = parser.parse_args()

    name = args.name or input("Enter Admin Name [HR Admin]: ").strip() or "HR Admin"
    email = args.email or input("Enter Admin Email [admin@roadexpress.com]: ").strip() or "admin@roadexpress.com"

    if args.password:
        password = args.password
    else:
        password = getpass.getpass("Enter Admin Password (min 6 chars): ").strip()
        if not password:
            print("Error: Password cannot be empty.")
            sys.exit(1)

    if len(password) < 6:
        print("Error: Password must be at least 6 characters long.")
        sys.exit(1)

    asyncio.run(create_or_update_admin(name=name, email=email, password=password))


if __name__ == "__main__":
    main()
