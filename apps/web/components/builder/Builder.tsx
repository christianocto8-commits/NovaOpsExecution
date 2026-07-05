"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { BuilderHeader } from "./BuilderHeader";
import { Canvas } from "./Canvas";
import { PropertyPanel } from "./PropertyPanel";
import { Toolbox } from "./Toolbox";
import { useBuilder } from "./hooks/useBuilder";

export function Builder() {
  const builder = useBuilder();

  return (
    <main className="flex min-h-screen bg-[#F7FAF8]">
      <Sidebar />

      <section className="flex-1 p-6">
        <BuilderHeader builder={builder} />

        <div className="grid h-[calc(100vh-130px)] gap-5 lg:grid-cols-[260px_1fr_320px]">
          <Toolbox builder={builder} />
          <Canvas builder={builder} />
          <PropertyPanel builder={builder} />
        </div>
      </section>
    </main>
  );
}
