import { navigationItems } from "./navigation-config";
import { NovaRole } from "./role-config";

export function canAccessNavigationItem(role: NovaRole, itemId: string) {
  const item = navigationItems.find((navItem) => navItem.id === itemId);
  if (!item) return false;

  return item.allowedRoles.includes(role);
}

export function getNavigationForRole(role: NovaRole) {
  return navigationItems.filter((item) => item.allowedRoles.includes(role));
}

export function canAccessPath(role: NovaRole, pathname: string) {
  const exactMatch = navigationItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch.allowedRoles.includes(role);
  }

  const parentMatch = navigationItems.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
  );

  if (!parentMatch) return true;

  return parentMatch.allowedRoles.includes(role);
}
