import { navigationItems, type NavigationItem } from "./navigation-config";

type PermissionChecker = (permission: string) => boolean;

function canAccessItem(can: PermissionChecker, item: NavigationItem) {
  if (item.requiredPermissions.length === 0) return true;
  return item.requiredPermissions.every((permission) => can(permission));
}

export function canAccessNavigationItem(can: PermissionChecker, itemId: string) {
  const item = navigationItems.find((navItem) => navItem.id === itemId);
  if (!item) return false;

  return canAccessItem(can, item);
}

export function getNavigationForPermissions(can: PermissionChecker) {
  return navigationItems.filter((item) => canAccessItem(can, item));
}

export function canAccessPath(can: PermissionChecker, pathname: string) {
  const exactMatch = navigationItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return canAccessItem(can, exactMatch);
  }

  const parentMatch = navigationItems.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
  );

  if (!parentMatch) return true;

  return canAccessItem(can, parentMatch);
}
