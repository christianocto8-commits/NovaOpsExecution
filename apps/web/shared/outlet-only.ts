/**
 * Outlet-only mode flag.
 *
 * Set at build time via NEXT_PUBLIC_OUTLET_ONLY=1 for the Android APK build.
 * The production web deployment at https://nova-ops.cloud does NOT set this
 * variable, so desktop/web users keep full role access. Only the native
 * Android app is restricted to the "outlet" role.
 */
export const OUTLET_ONLY_MODE = process.env.NEXT_PUBLIC_OUTLET_ONLY === "1";

export const OUTLET_ROLE_SLUG = "outlet";

export function isOutletRole(roleSlug: string | undefined): boolean {
  return roleSlug === OUTLET_ROLE_SLUG;
}

/**
 * Returns true when outlet-only mode is active and the given role is not the
 * outlet role. Used to block non-outlet users from the native Android app.
 */
export function shouldDenyRole(roleSlug: string | undefined): boolean {
  if (!OUTLET_ONLY_MODE) return false;
  return !isOutletRole(roleSlug);
}
