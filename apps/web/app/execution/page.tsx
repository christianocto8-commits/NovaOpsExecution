"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { getRuntimeTemplates, type RuntimeTemplate } from "@/services/runtime-template.service";

export default function ExecutionPage() {
  const [templates, setTemplates] = useState<RuntimeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await getRuntimeTemplates();
        setTemplates(data);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  return (
    <main className="flex min-h-screen bg-[#F7FAF8]">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#3D6B49]">Execution Engine</p>
          <h2 className="text-3xl font-bold text-[#1E1E1E]">Execution</h2>
          <p className="mt-2 text-gray-500">Start and complete published operational templates.</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[#1E1E1E]">Runtime Templates</h3>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              No runtime templates found. Publish a builder document first.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold text-[#274733]">{template.title}</p>
                    <p className="text-sm text-gray-500">
                      Version {template.version} • {template.status}
                    </p>
                  </div>

                  <Link
                    href={`/execution/${template.id}`}
                    className="rounded-lg bg-[#274733] px-4 py-2 text-sm font-medium text-white"
                  >
                    Start
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
