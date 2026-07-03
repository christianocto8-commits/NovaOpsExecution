"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@novaops.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
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

      // sementara gunakan default outlet
      localStorage.setItem("novaops_outlet_id", "1");

      setMessage("Login success. Redirecting...");

      // Force navigation
      window.location.replace("/dashboard");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error ? error.message : "Unable to connect to API"
      );
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

          <h1 className="mt-3 text-5xl font-bold text-[#1E1E1E]">
            Sign in
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Multi Outlet Operations Platform
          </p>
        </div>

        <div className="space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm outline-none focus:border-[#3D6B49]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />

          <input
            type="password"
            className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm outline-none focus:border-[#3D6B49]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

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