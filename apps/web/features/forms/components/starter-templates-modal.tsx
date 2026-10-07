"use client";

import { Check, Sparkles, Store, Thermometer, Utensils, Wrench, ShieldCheck } from "lucide-react";
import { Modal } from "@/shared/ui/overlay/modal";
import {
  STARTER_TEMPLATES,
  StarterTemplateDefinition,
  instantiateStarterTemplate,
} from "../constants/starter-templates";
import { getFormCategoryLabel } from "../constants/form-categories";
import type { FormTemplate } from "../types";

type StarterTemplatesModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: FormTemplate) => void;
};

const iconMap = {
  opening: Store,
  closing: Utensils,
  temp: Thermometer,
  cleaning: ShieldCheck,
  quality: Wrench,
};

export function StarterTemplatesModal({
  open,
  onClose,
  onSelectTemplate,
}: StarterTemplatesModalProps) {
  function handleChoose(definition: StarterTemplateDefinition) {
    const template = instantiateStarterTemplate(definition);
    onSelectTemplate(template);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pilih Template Standar F&B (Zenput-Style)"
      description="Gunakan template siap pakai industri F&B untuk mempercepat pembuatan checklist outlet tanpa perlu membuat dari nol."
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2 max-h-[65vh] overflow-y-auto pr-1">
        {STARTER_TEMPLATES.map((def) => {
          const Icon = iconMap[def.iconName] ?? Sparkles;

          return (
            <div
              key={def.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    {def.badge}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  {def.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {def.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                    {getFormCategoryLabel(def.category)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-600">
                    {def.fields.length} item checklist
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleChoose(def)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <Check className="size-3.5" />
                  <span>Gunakan Template Ini</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
