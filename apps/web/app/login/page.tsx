"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { buildApiUrl } from "@/lib/api-url";
import { getMe, login, verifyOtp, type LoginResponse } from "@/services/auth.service";
import { useLanguage } from "@/shared/i18n";
import type { NovaRole } from "@/shared/navigation/role-config";
import { setStoredWorkspaceRole } from "@/shared/navigation/workspace-store";

const REMEMBER_KEY = "novaops_remember_identifier";
const REMEMBER_OUTLET_CONTEXT_KEY = "novaops_remember_outlet_context";
const GOOGLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
const OIDC_SSO_ENABLED = process.env.NEXT_PUBLIC_OIDC_SSO_ENABLED === "true";
const SAML_SSO_ENABLED = process.env.NEXT_PUBLIC_SAML_SSO_ENABLED === "true";
const OIDC_SSO_LABEL = process.env.NEXT_PUBLIC_OIDC_SSO_LABEL?.trim() || "Sign in with SSO";
const SAML_SSO_LABEL = process.env.NEXT_PUBLIC_SAML_SSO_LABEL?.trim() || "Sign in with SAML SSO";

function getSafeReturnUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function storeOutletContext(outletAccess: Awaited<ReturnType<typeof getMe>>["outlet_access"]) {
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");

  const preferredOutletId =
    outletAccess.scope === "single"
      ? outletAccess.legacy_outlet_id != null
        ? String(outletAccess.legacy_outlet_id)
        : (outletAccess.outlet_id ?? outletAccess.outlet_ids[0])
      : null;

  if (preferredOutletId) {
    localStorage.setItem("novaops_outlet_id", preferredOutletId);
  }
}

function getWorkspaceOutletContext(
  outletAccess: Awaited<ReturnType<typeof getMe>>["outlet_access"]
) {
  const preferredOutlet = outletAccess.outlets?.[0];

  return {
    outletId: outletAccess.outlet_id ?? outletAccess.outlet_ids?.[0] ?? preferredOutlet?.id,
    outletName: outletAccess.outlet_name ?? preferredOutlet?.name,
    outletCode: outletAccess.outlet_code ?? preferredOutlet?.code,
    legacyOutletId: outletAccess.legacy_outlet_id ?? undefined,
  };
}

function getWorkspaceRoleFromSlug(roleSlug: string): NovaRole {
  if (roleSlug === "area_manager") return "AREA_MANAGER";
  if (roleSlug === "outlet") return "OUTLET";
  if (roleSlug === "finance") return "FINANCE";
  return "OWNER_ADMIN";
}

function getPostLoginDestination(roleSlug: string, fallbackUrl: string) {
  return roleSlug === "finance" && fallbackUrl === "/dashboard"
    ? "/dashboard/finance-handoff"
    : fallbackUrl;
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
          <div className="text-sm text-slate-500">{t("login.loading")}</div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function subscribeRememberStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getRememberedIdentifierSnapshot() {
  return localStorage.getItem(REMEMBER_KEY) ?? "";
}

function getServerRememberedIdentifierSnapshot() {
  return "";
}

function LoginPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const returnUrl = getSafeReturnUrl(searchParams.get("returnUrl"));
  const rememberOutlet = searchParams.get("rememberOutlet") === "1";
  const rememberedIdentifier = useSyncExternalStore(
    subscribeRememberStorage,
    getRememberedIdentifierSnapshot,
    getServerRememberedIdentifierSnapshot
  );
  const [rememberedOutletName, setRememberedOutletName] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  useEffect(() => {
    setBgUrl(localStorage.getItem("novaops_login_bg_url"));
  }, []);

  useEffect(() => {
    if (!rememberedIdentifier) return;

    setIdentifier(rememberedIdentifier);
    setRememberMe(true);
  }, [rememberedIdentifier]);

  useEffect(() => {
    if (!rememberOutlet) return;

    try {
      const savedContext = localStorage.getItem(REMEMBER_OUTLET_CONTEXT_KEY);
      if (savedContext) {
        const parsed = JSON.parse(savedContext) as { outletName?: string };
        setRememberedOutletName(parsed.outletName ?? null);
      }
    } catch {
      setRememberedOutletName(null);
    }
  }, [rememberOutlet]);

  async function completeLogin(data: LoginResponse) {
    if (!data.access_token || !data.refresh_token) {
      throw new Error("Login token tidak tersedia.");
    }

    localStorage.setItem("novaops_token", data.access_token);
    localStorage.setItem("novaops_refresh_token", data.refresh_token);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, identifier.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const currentUser = await getMe();
    storeOutletContext(currentUser.outlet_access);

    let outletContext = getWorkspaceOutletContext(currentUser.outlet_access);

    if (rememberOutlet) {
      try {
        const savedContext = localStorage.getItem(REMEMBER_OUTLET_CONTEXT_KEY);
        if (savedContext) {
          const parsed = JSON.parse(savedContext) as {
            outletName?: string;
            outletCode?: string;
          };

          outletContext = {
            ...outletContext,
            outletName: parsed.outletName ?? outletContext.outletName,
            outletCode: parsed.outletCode ?? outletContext.outletCode,
          };
        }
      } catch {
        // Fall back to user outlet context.
      }
    }

    setStoredWorkspaceRole(
      getWorkspaceRoleFromSlug(currentUser.role.slug),
      outletContext
    );

    setMessage(t("login.success"));
    window.location.assign(getPostLoginDestination(currentUser.role.slug, returnUrl));
  }

  async function handleLogin() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await login({
        identifier: identifier.trim(),
        password,
      });

      if (data.requires_otp && data.otp_challenge_id) {
        setOtpChallengeId(data.otp_challenge_id);
        setMessage(data.message ?? "Kode OTP dikirim ke email terdaftar.");
        setLoading(false);
        return;
      }

      await completeLogin(data);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : t("login.error"));
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (loading || !otpChallengeId) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await verifyOtp({
        challengeId: otpChallengeId,
        code: otpCode.trim(),
      });
      await completeLogin(data);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Kode OTP tidak valid.");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen overflow-hidden"
      suppressHydrationWarning
      style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--background)" }}
    >
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.35fr)] xl:grid-cols-[minmax(520px,0.85fr)_minmax(620px,1.45fr)]">
        <section className="hidden min-h-screen flex-col justify-between bg-[#274733] px-10 py-12 text-white lg:flex xl:px-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
              {t("login.brand")}
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">{t("login.heroTitle")}</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-emerald-100">{t("login.heroBody")}</p>
          </div>
          <ul className="space-y-3 text-sm text-emerald-100">
            <li>• {t("login.heroBullet1")}</li>
            <li>• {t("login.heroBullet2")}</li>
            <li>• {t("login.heroBullet3")}</li>
          </ul>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#DDE8E1] bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3D6B49]">
            {t("login.brand")}
          </p>

          <h1 className="mt-3 text-5xl font-bold text-[#1E1E1E]">{t("login.title")}</h1>

          <p className="mt-3 text-sm text-slate-500">{t("login.subtitle")}</p>
          {rememberedOutletName ? (
            <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {t("login.rememberOutlet", { outlet: rememberedOutletName })}
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm outline-none focus:border-[#3D6B49]"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t("login.identifierPlaceholder")}
            autoComplete="username"
            disabled={Boolean(otpChallengeId)}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-24 text-sm outline-none focus:border-[#3D6B49]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
              disabled={Boolean(otpChallengeId)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleLogin();
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3D6B49]"
            >
              {showPassword ? t("login.hidePassword") : t("login.showPassword")}
            </button>
          </div>

          {otpChallengeId ? (
            <input
              className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-lg font-bold tracking-[0.35em] text-emerald-900 outline-none focus:border-[#3D6B49]"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleVerifyOtp();
              }}
            />
          ) : null}

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => {
                const checked = event.target.checked;
                setRememberMe(checked);

                if (!checked) {
                  localStorage.removeItem(REMEMBER_KEY);
                }
              }}
              className="h-4 w-4 rounded border-slate-300 accent-[#3D6B49]"
            />
            {t("login.rememberUsername")}
          </label>

          <button
            type="button"
            disabled={
              loading ||
              (!otpChallengeId && (!identifier.trim() || !password.trim())) ||
              (Boolean(otpChallengeId) && otpCode.trim().length !== 6)
            }
            onClick={() => void (otpChallengeId ? handleVerifyOtp() : handleLogin())}
            className="w-full rounded-2xl bg-[#274733] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1F3A2A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("login.signingIn") : otpChallengeId ? "Verify OTP" : t("login.submit")}
          </button>

          {GOOGLE_OAUTH_ENABLED && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>{t("login.or")}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  window.location.href = buildApiUrl("/api/v1/auth/google/login");
                }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true" className="text-lg">
                  G
                </span>
                {t("login.google")}
              </button>
            </div>
          )}

          {(OIDC_SSO_ENABLED || SAML_SSO_ENABLED) ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("login.ssoGroup")}
              </p>
              {OIDC_SSO_ENABLED ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    window.location.href = buildApiUrl("/api/v1/auth/oidc/login");
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {OIDC_SSO_LABEL}
                </button>
              ) : null}
              {SAML_SSO_ENABLED ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    window.location.href = buildApiUrl("/api/v1/auth/saml/login");
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {SAML_SSO_LABEL}
                </button>
              ) : null}
            </div>
          ) : null}

          {message && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>
      </div>
        </section>
      </div>
    </main>
  );
}
