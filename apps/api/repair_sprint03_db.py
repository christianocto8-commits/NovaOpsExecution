from sqlalchemy import text

from app.core.database import engine


REPAIR_SQL = """
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE user_outlet_roles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE user_outlet_roles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
"""


def main() -> None:
    with engine.begin() as connection:
        connection.execute(text(REPAIR_SQL))

    print("Sprint 03 database repair completed successfully.")


if __name__ == "__main__":
    main()