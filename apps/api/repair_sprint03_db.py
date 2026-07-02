from sqlalchemy import inspect, text

from app.core.database import engine


def table_exists(table_name: str) -> bool:
    return inspect(engine).has_table(table_name)


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(120) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """))

    if not column_exists("outlets", "organization_id"):
        conn.execute(text("ALTER TABLE outlets ADD COLUMN organization_id INTEGER NULL"))

    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_outlets_organization_id'
            ) THEN
                ALTER TABLE outlets
                ADD CONSTRAINT fk_outlets_organization_id
                FOREIGN KEY (organization_id) REFERENCES organizations(id);
            END IF;
        END $$;
    """))

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_outlet_roles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            outlet_id INTEGER NOT NULL REFERENCES outlets(id),
            role VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_user_outlet_role UNIQUE (user_id, outlet_id)
        )
    """))

print("Sprint 03 database repair completed.")
