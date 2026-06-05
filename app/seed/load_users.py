import asyncio

import structlog
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.employee import Employee, User
from app.services.auth import hash_password

logger = structlog.get_logger()

DEFAULT_PASSWORD = "ChangeMe123!"

SEED_USERS = [
    {
        "username": "employee",
        "role": "employee",
        "employee_code": "demo_employee",
        "display_name": "Demo Employee User",
    },
    {
        "username": "hr",
        "role": "hr",
        "employee_code": "demo_hr",
        "display_name": "Demo HR User",
    },
    {
        "username": "leadership",
        "role": "leadership",
        "employee_code": "demo_lead",
        "display_name": "Demo Leadership User",
    },
]


async def seed_users() -> None:
    async with AsyncSessionLocal() as session:
        employee_rows = await session.execute(select(Employee))
        employees_by_code = {
            employee.code: employee for employee in employee_rows.scalars().all()
        }

        created = 0
        updated = 0
        for item in SEED_USERS:
            employee = employees_by_code.get(item["employee_code"])
            result = await session.execute(
                select(User).where(User.username == item["username"])
            )
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    username=item["username"],
                    password_hash=hash_password(DEFAULT_PASSWORD),
                )
                session.add(user)
                created += 1
            else:
                updated += 1

            user.role = item["role"]
            user.employee = employee
            user.display_name = item["display_name"]

        await session.commit()
        logger.info(
            "seed.completed",
            table="users",
            created=created,
            updated=updated,
            default_password=DEFAULT_PASSWORD,
        )


if __name__ == "__main__":
    asyncio.run(seed_users())
