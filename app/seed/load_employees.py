import asyncio

import structlog
from sqlalchemy import delete

from app.database import AsyncSessionLocal
from app.models.employee import Employee, User

logger = structlog.get_logger()

SAMPLE_EMPLOYEES = [
    {
        "employee_id": "DEMO001",
        "code": "demo_lead",
        "full_name": "Demo Leadership User",
        "birth_year": 1988,
        "status": "Active",
        "raw_title": "Chief Product Officer",
        "role_track": "Leadership",
        "title": "Chief Product Officer",
        "expertise_group": "Product",
        "expertise_segment": "BUILD",
        "training_source": "External hire",
    },
    {
        "employee_id": "DEMO002",
        "code": "demo_hr",
        "full_name": "Demo HR User",
        "birth_year": 1992,
        "status": "Active",
        "raw_title": "HR Specialist",
        "role_track": "Professional",
        "title": "HR Specialist",
        "expertise_group": "Admin",
        "expertise_segment": "MANAGE",
        "training_source": "Internal pipeline",
    },
    {
        "employee_id": "DEMO003",
        "code": "demo_employee",
        "full_name": "Demo Employee User",
        "birth_year": 1998,
        "status": "Active",
        "raw_title": "Senior Software Engineer",
        "role_track": "Professional",
        "title": "Senior Software Engineer",
        "expertise_group": "Technical",
        "expertise_segment": "BUILD",
        "training_source": "Internal pipeline",
    },
    {
        "employee_id": "DEMO004",
        "code": "demo_tech_lead",
        "full_name": "Demo Technical Lead",
        "birth_year": 1994,
        "status": "Active",
        "raw_title": "Technical Lead",
        "role_track": "Management",
        "title": "Technical Lead",
        "expertise_group": "Technical",
        "expertise_segment": "BUILD",
        "training_source": "Internal pipeline",
    },
    {
        "employee_id": "DEMO005",
        "code": "demo_product",
        "full_name": "Demo Product Manager",
        "birth_year": 1996,
        "status": "Active",
        "raw_title": "Product Manager",
        "role_track": "Professional",
        "title": "Product Manager",
        "expertise_group": "Product",
        "expertise_segment": "BUILD",
        "training_source": "External hire",
    },
    {
        "employee_id": "DEMO006",
        "code": "demo_accounting",
        "full_name": "Demo Accountant",
        "birth_year": 1995,
        "status": "Active",
        "raw_title": "Accountant",
        "role_track": "Professional",
        "title": "Accountant",
        "expertise_group": "Accounting",
        "expertise_segment": "PROFIT",
        "training_source": "External hire",
    },
    {
        "employee_id": "DEMO007",
        "code": "demo_support",
        "full_name": "Demo Support Specialist",
        "birth_year": 1999,
        "status": "Active",
        "raw_title": "Customer Success Specialist",
        "role_track": "Professional",
        "title": "Customer Success Specialist",
        "expertise_group": "CS",
        "expertise_segment": "SERVICE",
        "training_source": "Internal pipeline",
    },
    {
        "employee_id": "DEMO008",
        "code": "demo_intern",
        "full_name": "Demo Software Intern",
        "birth_year": 2004,
        "status": "Active",
        "raw_title": "Software Intern",
        "role_track": "Intern",
        "title": "Software Intern",
        "expertise_group": "Technical",
        "expertise_segment": "BUILD",
        "training_source": "Internship",
    },
]


async def seed_employees() -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(delete(User))
        await session.execute(delete(Employee))
        session.add_all(Employee(**row) for row in SAMPLE_EMPLOYEES)
        await session.commit()
        logger.info(
            "seed.completed",
            table="employees",
            row_count=len(SAMPLE_EMPLOYEES),
            source="sample_data",
        )


if __name__ == "__main__":
    asyncio.run(seed_employees())
