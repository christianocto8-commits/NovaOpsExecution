OWNER_ROLE = "owner"
ADMIN_ROLE = "admin"
REGIONAL_MANAGER_ROLE = "regional_manager"
DISTRICT_MANAGER_ROLE = "district_manager"
AREA_MANAGER_ROLE = "area_manager"
OUTLET_ROLE = "outlet"
FINANCE_ROLE = "finance"

SYSTEM_ROLES = [
    OWNER_ROLE,
    ADMIN_ROLE,
    REGIONAL_MANAGER_ROLE,
    DISTRICT_MANAGER_ROLE,
    AREA_MANAGER_ROLE,
    OUTLET_ROLE,
    FINANCE_ROLE,
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
    "workflow.edit",
    "workflow.delete",
    "workflow.publish",
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

    "finance.read",
    "finance.submit",
    "finance.review",
    "finance.export",
]

ROLE_PERMISSION_MAP = {
    OWNER_ROLE: DEFAULT_PERMISSIONS,
    ADMIN_ROLE: DEFAULT_PERMISSIONS,
    REGIONAL_MANAGER_ROLE: [
        "task.read",
        "task.create",
        "task.edit",
        "task.execute",
        "form.read",
        "form.submit",
        "workflow.read",
        "workflow.approve",
        "workflow.escalate",
        "report.read",
        "report.export",
        "notification.read",
        "user.read",
        "outlet.read",
    ],
    DISTRICT_MANAGER_ROLE: [
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
        "finance.submit",
        "finance.read",
    ],
    FINANCE_ROLE: [
        "task.read",
        "report.read",
        "report.export",
        "notification.read",
        "finance.read",
        "finance.review",
        "finance.export",
        "outlet.read",
    ],
}
