"use client";

import { useBuilder } from "./hooks/useBuilder";

type BuilderState = ReturnType<typeof useBuilder>;

type Props = {
  builder: BuilderState;
};

export function Toolbox({ builder }: Props) {
  return (
    <aside className="overflow-auto rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[#1E1E1E]">Toolbox</h3>

      <div className="space-y-2">
        {builder.fieldTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => builder.addField(type)}
            className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-[#EAF1EC]"
          >
            + {type}
          </button>
        ))}
      </div>
    </aside>
  );
}
