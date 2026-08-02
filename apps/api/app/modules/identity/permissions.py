OWNER_ROLE = "owner"
ADMIN_ROLE = "admin"
REGIONAL_MANAGER_ROLE = "regional_manager"
DISTRICT_MANAGER_ROLE = "district_manager"
AREA_MANAGER_ROLE = "area_manager"
OUTLET_ROLE = "outlet"
FINANCE_ROLE = "finance"
FINANCE_HEAD_OFFICE_ROLE = "finance_head_office"

SYSTEM_ROLES = [
    OWNER_ROLE,
    ADMIN_ROLE,
    REGIONAL_MANAGER_ROLE,
    DISTRICT_MANAGER_ROLE,
    AREA_MANAGER_ROLE,
    OUTLET_ROLE,
    FINANCE_ROLE,
    FINANCE_HEAD_OFFICE_ROLE,
]

ROLE_DISPLAY_NAMES = {
    OWNER_ROLE: "Owner",
    ADMIN_ROLE: "Admin",
    REGIONAL_MANAGER_ROLE: "Regional Manager",
    DISTRICT_MANAGER_ROLE: "District Manager",
    AREA_MANAGER_ROLE: "Area Manager",
    OUTLET_ROLE: "Outlet",
    FINANCE_ROLE: "Finance Outlet",
    FINANCE_HEAD_OFFICE_ROLE: "Finance Head Office",
}

FINANCE_PERMISSIONS = [
    "task.read",
    "report.read",
    "report.export",
    "notification.read",
    "finance.read",
    "finance.review",
    "finance.export",
    "outlet.read",
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

    "incident.read",
    "incident.create",
    "incident.manage",
    "followup.read",
    "followup.create",
    "followup.update",

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
        "incident.read",
        "incident.create",
        "incident.manage",
        "followup.read",
        "followup.create",
        "followup.update",
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
        "incident.read",
        "incident.create",
        "incident.manage",
        "followup.read",
        "followup.create",
        "followup.update",
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
        "incident.read",
        "incident.create",
        "incident.manage",
        "followup.read",
        "followup.create",
        "followup.update",
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
        "incident.read",
        "incident.create",
        "followup.read",
        "followup.update",
        "finance.submit",
        "finance.read",
    ],
    FINANCE_ROLE: FINANCE_PERMISSIONS,
    FINANCE_HEAD_OFFICE_ROLE: list(FINANCE_PERMISSIONS),
}
