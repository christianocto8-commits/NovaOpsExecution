import { Sidebar } from "@/components/layout/Sidebar";

export default function FormsPage() {
  return (
    <main className="flex min-h-screen bg-[#F7FAF8]">
      <Sidebar />
      <section className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#1E1E1E]">Forms</h1>
        <p className="mt-2 text-gray-500">Manage builder templates and published forms.</p>
      </section>
    </main>
  );
}
