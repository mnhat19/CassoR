import importlib

import pytest
from httpx import ASGITransport, AsyncClient


def reload_modules() -> None:
    import app.config as config
    import app.database as database
    import app.models.employee as employee_models
    import app.models.expertise as expertise_models
    import app.seed.load_employees as load_employees
    import app.seed.load_expertise as load_expertise
    import app.seed.load_titles as load_titles
    import app.seed.load_users as load_users
    import app.seed.sync_titles_from_expertise_grid as sync_titles_from_expertise_grid
    import app.main as main

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(expertise_models)
    importlib.reload(employee_models)
    importlib.reload(load_expertise)
    importlib.reload(sync_titles_from_expertise_grid)
    importlib.reload(load_titles)
    importlib.reload(load_employees)
    importlib.reload(load_users)
    importlib.reload(main)


@pytest.mark.asyncio
async def test_auth_links_my_path_and_guards_radar(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "cassor_auth_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")

    reload_modules()

    from app.database import Base, engine
    from app.main import app
    from app.seed.load_employees import seed_employees
    from app.seed.load_expertise import seed_expertise
    from app.seed.load_titles import seed_titles
    from app.seed.load_users import DEFAULT_PASSWORD, seed_users

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_expertise()
    await seed_titles()
    await seed_employees()
    await seed_users()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        employee_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "employee", "password": DEFAULT_PASSWORD},
        )
        assert employee_login.status_code == 200
        employee_token = employee_login.json()["token"]

        employee_path = await client.get(
            "/api/v1/me/path",
            headers={"Authorization": f"Bearer {employee_token}"},
        )
        assert employee_path.status_code == 200
        assert employee_path.json()["current_node_id"] == "professional-3"

        employee_radar = await client.get(
            "/api/v1/radar/pyramid",
            headers={"Authorization": f"Bearer {employee_token}"},
        )
        assert employee_radar.status_code == 403

        hr_login = await client.post(
            "/api/v1/auth/login",
            json={"username": "hr", "password": DEFAULT_PASSWORD},
        )
        assert hr_login.status_code == 200
        hr_token = hr_login.json()["token"]

        hr_radar = await client.get(
            "/api/v1/radar/pyramid",
            headers={"Authorization": f"Bearer {hr_token}"},
        )
        assert hr_radar.status_code == 200
        assert len(hr_radar.json()) > 0
