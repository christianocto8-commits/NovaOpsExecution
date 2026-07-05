from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine


def main() -> None:
    settings = get_settings()

    print("NovaOps Backend Smoke Test")
    print("==========================")
    print(f"App        : {settings.app_name}")
    print(f"Version    : {settings.app_version}")
    print(f"Env        : {settings.environment}")
    print(f"Database   : {engine.url}")

    with engine.connect() as connection:
        result = connection.execute(text("select 1")).scalar_one()
        print(f"DB Check   : {result}")

    print("Status     : OK")


if __name__ == "__main__":
    main()
