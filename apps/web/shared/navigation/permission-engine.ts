import { navigationItems, type NavigationItem } from "./navigation-config";
import { CurrentWorkspace } from "./role-config";

type PermissionChecker = (permission: string) => boolean;

export type NavigationOptions = {
  capaEnabled?: boolean;
};

function isCapaNavigationItem(item: NavigationItem) {
  return item.id === "corrective-actions";
}

const outletNavigationItemIds = new Set([
  "operator",
  "dashboard",
  "tasks",
  "forms",
  "reports",
  "compliance",
  "exceptions",
  "announcements",
  "notifications",
  "activity",
  "drafts",
  "history",
  "corrective-actions",
  "incidents",
  "evidence",
  "training",
  "settings",
  "more",
]);

const outletVisibleNavigationItemIds = new Set([
  "operator",
  "tasks",
  "forms",
  "reports",
  "more",
  "drafts",
  "notifications",
  "settings",
  "corrective-actions",
  "training",
  "announcements",
]);

const areaManagerVisibleNavigationItemIds = new Set([
  "dashboard",
  "tasks",
  "schedules",
  "forms",
  "reports",
  "drafts",
  "settings",
  "exceptions",
  "corrective-actions",
  "incidents",
  "modules",
]);

const areaManagerNavigationItemIds = new Set([
  "dashboard",
  "activity",
  "announcements",
  "audit",
  "compliance",
  "exceptions",
  "corrective-actions",
  "drafts",
  "evidence",
  "forms",
  "history",
  "incidents",
  "iot",
  "notifications",
  "outlets",
  "outlet-profile",
  "reports",
  "report-automation",
  "schedules",
  "settings",
  "tasks",
  "training",
  "workflows",
  "modules",
]);

const financeNavigationItemIds = new Set(["finance", "finance-handoff", "notifications"]);
const managerRoles = new Set(["REGIONAL_MANAGER", "DISTRICT_MANAGER", "AREA_MANAGER"]);

function canAccessItemForWorkspace(item: NavigationItem, workspace?: CurrentWorkspace) {
  if (!workspace) return true;
  // Outlet Home is crew-facing; owner/admin keep the enterprise Dashboard instead.
  if (workspace.role === "OWNER_ADMIN") {
    return item.id !== "operator";
  }
  if (managerRoles.has(workspace.role)) return areaManagerNavigationItemIds.has(item.id);
  if (workspace.role === "FINANCE") return financeNavigationItemIds.has(item.id);

  return outletNavigationItemIds.has(item.id);
}

function canAccessItem(can: PermissionChecker, item: NavigationItem, workspace?: CurrentWorkspace) {
  if (!canAccessItemForWorkspace(item, workspace)) return false;

  if (item.requiredPermissions.length === 0) return true;
  return item.requiredPermissions.every((permission) => can(permission));
}

export function canAccessNavigationItem(
  can: PermissionChecker,
  itemId: string,
  workspace?: CurrentWorkspace
) {
  const item = navigationItems.find((navItem) => navItem.id === itemId);
  if (!item) return false;

  return canAccessItem(can, item, workspace);
}

export function getNavigationForPermissions(
  can: PermissionChecker,
  workspace?: CurrentWorkspace,
  options?: NavigationOptions
) {
  const visibleItems = navigationItems.filter((item) => {
    if (options?.capaEnabled === false && isCapaNavigationItem(item)) {
      return false;
    }

    if (workspace?.role === "OUTLET") {
      return outletVisibleNavigationItemIds.has(item.id) && canAccessItem(can, item, workspace);
    }

    if (workspace && managerRoles.has(workspace.role)) {
      return (
        areaManagerVisibleNavigationItemIds.has(item.id) && canAccessItem(can, item, workspace)
      );
    }

    if (workspace?.role === "FINANCE") {
      return financeNavigationItemIds.has(item.id) && canAccessItem(can, item, workspace);
    }

    if (item.sidebar === false) {
      return false;
    }

    return canAccessItem(can, item, workspace);
  });

  if (workspace?.role === "OUTLET") {
    const outletOrder = [
      "operator",
      "tasks",
      "forms",
      "reports",
      "more",
      "drafts",
      "corrective-actions",
      "training",
      "notifications",
      "announcements",
      "settings",
    ];
    return [...visibleItems].sort(
      (left, right) => outletOrder.indexOf(left.id) - outletOrder.indexOf(right.id)
    );
  }

  if (workspace?.role === "FINANCE") {
    const financeOrder = ["finance", "finance-handoff", "notifications"];
    return [...visibleItems].sort(
      (left, right) => financeOrder.indexOf(left.id) - financeOrder.indexOf(right.id)
    );
  }

  return visibleItems;
}

export function canAccessPath(
  can: PermissionChecker,
  pathname: string,
  workspace?: CurrentWorkspace
) {
  const exactMatch = navigationItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return canAccessItem(can, exactMatch, workspace);
  }

  const parentMatch = navigationItems.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
  );

  if (!parentMatch) return true;

  return canAccessItem(can, parentMatch, workspace);
}
