from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def generate_reference_number(db: AsyncSession) -> str:
    """
    Generate a human-readable, unique, monotonic reference number in format:
    APP-YYYYMMDD-NNNN
    Example: APP-20261113-0042
    Backed by applications_global_seq sequence.
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")

    res = await db.execute(text("SELECT nextval('applications_global_seq');"))
    seq_num = res.scalar() or 1

    return f"APP-{date_str}-{seq_num:04d}"
