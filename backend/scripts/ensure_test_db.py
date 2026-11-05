import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://postgres:2301420045@localhost:5432/postgres")
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'hrms_test_db'")
        if not exists:
            await conn.execute("CREATE DATABASE hrms_test_db")
            print("Successfully created hrms_test_db")
        else:
            print("hrms_test_db already exists")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
