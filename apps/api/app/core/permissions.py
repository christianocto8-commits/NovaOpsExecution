ROLE_PERMISSIONS = {
    "Owner": ["*"],
    "Consultant": [
        "dashboard.view", "builder.view", "builder.create", "builder.edit", "builder.publish",
        "execution.view", "execution.start", "execution.submit", "task.view", "report.view", "report.export",
        "organization.view", "outlet.view", "outlet.switch",
    ],
    "Frontline Manager": [
        "dashboard.view", "execution.view", "execution.start", "execution.submit", "task.view",
        "task.assign", "task.close", "report.view", "organization.view", "outlet.view", "outlet.switch",
    ],
    "Head Barista": [
        "dashboard.view", "builder.view", "builder.create", "execution.view", "execution.start",
        "execution.submit", "task.view", "task.assign", "task.close", "report.view", "outlet.view", "outlet.switch",
    ],
    "Lead Barista": [
        "dashboard.view", "execution.view", "execution.start", "execution.submit", "task.view", "task.close", "outlet.view",
    ],
    "Crew": ["execution.view", "execution.start", "execution.submit", "outlet.view"],
    "Auditor": ["dashboard.view", "execution.view", "report.view", "report.export", "outlet.view"],
}


def get_permissions_for_role(role: str) -> list[str]:
    permissions = ROLE_PERMISSIONS.get(role, [])
    return permissions


def has_permission(role: str, permission: str) -> bool:
    permissions = get_permissions_for_role(role)
    return "*" in permissions or permission in permissions
