"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const REMEMBER_KEY = "novaops_remember_identifier";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(() => {
    if (typeof window === "undefined") return "admin";
    return localStorage.getItem(REMEMBER_KEY) ?? "admin";
  });
  const [password, setPassword] = useState("Admin12345!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem(REMEMBER_KEY));
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");


  async function handleLogin() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail
            ? typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail)
            : "Login failed"
        );
        return;
      }

      localStorage.setItem("novaops_token", data.access_token);
      localStorage.removeItem("novaops_outlet_id");

      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, identifier);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      setMessage("Login success. Redirecting...");
      window.location.replace("/dashboard");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to connect to API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#DDE8E1] bg-white p-10 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3D6B49]">
            NOVAOPS ENTERPRISE
          </p>

          <h1 className="mt-3 text-5xl font-bold text-[#1E1E1E]">Sign in</h1>

          <p className="mt-3 text-sm text-slate-500">Multi Outlet Operations Platform</p>
        </div>

        <div className="space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm outline-none focus:border-[#3D6B49]"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username or email"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-24 text-sm outline-none focus:border-[#3D6B49]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3D6B49]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#3D6B49]"
            />
            Remember me
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={handleLogin}
            className="w-full rounded-2xl bg-[#274733] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1F3A2A] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {message && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

