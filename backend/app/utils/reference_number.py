from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def generate_reference_number(db: AsyncSession) -> str:
    """
    Generate a human-readable, unique, strictly monotonic reference number in format:
    APP-YYYYMMDD-NNNN
    Example: APP-20261105-0042
    Backed by a daily PostgreSQL sequence.
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    seq_name = f"app_ref_seq_{date_str}"

    # Ensure sequence exists first so transaction never enters aborted state
    await db.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name} START 1;"))
    res = await db.execute(text(f"SELECT nextval('{seq_name}');"))
    seq_num = res.scalar() or 1

    return f"APP-{date_str}-{seq_num:04d}"
