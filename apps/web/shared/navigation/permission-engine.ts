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
  "dashboard",
  "tasks",
  "forms",
  "reports",
  "exceptions",
  "announcements",
  "notifications",
  "activity",
  "drafts",
  "history",
  "corrective-actions",
  "evidence",
  "training",
  "settings",
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
  "iot",
  "notifications",
  "outlets",
  "reports",
  "schedules",
  "settings",
  "tasks",
  "training",
  "workflows",
]);

function canAccessItemForWorkspace(item: NavigationItem, workspace?: CurrentWorkspace) {
  if (!workspace) return true;
  if (workspace.role === "OWNER_ADMIN") return true;
  if (workspace.role === "AREA_MANAGER") return areaManagerNavigationItemIds.has(item.id);

  return outletNavigationItemIds.has(item.id);
}

function canAccessItem(can: PermissionChecker, item: NavigationItem, workspace?: CurrentWorkspace) {
  if (!canAccessItemForWorkspace(item, workspace)) return false;
  if (workspace?.role === "OWNER_ADMIN") return true;
  if (workspace?.role === "AREA_MANAGER") return true;
  if (workspace?.role === "OUTLET") return true;

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
  return navigationItems.filter((item) => {
    if (options?.capaEnabled === false && isCapaNavigationItem(item)) {
      return false;
    }

    return canAccessItem(can, item, workspace);
  });
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
