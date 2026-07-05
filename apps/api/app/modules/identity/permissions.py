OWNER_ROLE = "owner"
ADMIN_ROLE = "admin"
AREA_MANAGER_ROLE = "area_manager"
OUTLET_ROLE = "outlet"

SYSTEM_ROLES = [
    OWNER_ROLE,
    ADMIN_ROLE,
    AREA_MANAGER_ROLE,
    OUTLET_ROLE,
]

DEFAULT_PERMISSIONS = [
    "task.read",
    "task.create",
    "task.edit",
    "task.delete",
    "task.execute",

    "form.read",
    "form.create",
    "form.edit",
    "form.publish",
    "form.submit",

    "workflow.read",
    "workflow.create",
    "workflow.approve",
    "workflow.escalate",

    "report.read",
    "report.export",

    "notification.read",
    "notification.manage",

    "user.read",
    "user.create",
    "user.edit",
    "user.delete",

    "outlet.read",
    "outlet.create",
    "outlet.edit",
    "outlet.delete",
]

ROLE_PERMISSION_MAP = {
    OWNER_ROLE: DEFAULT_PERMISSIONS,
    ADMIN_ROLE: DEFAULT_PERMISSIONS,
    AREA_MANAGER_ROLE: [
        "task.read",
        "task.create",
        "task.edit",
        "task.execute",
        "form.read",
        "form.submit",
        "workflow.read",
        "workflow.approve",
        "report.read",
        "report.export",
        "notification.read",
        "user.read",
        "outlet.read",
    ],
    OUTLET_ROLE: [
        "task.read",
        "task.execute",
        "form.read",
        "form.submit",
        "workflow.read",
        "notification.read",
    ],
}
