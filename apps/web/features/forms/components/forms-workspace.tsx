"use client";

import { formTemplates } from "@/features/forms/data/mock-form-templates";
import { FormTemplate } from "@/features/forms/types";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";

const columns: EnterpriseColumn<FormTemplate>[] = [
  {
    key: "name",
    header: "Form",
    render: (form) => (
      <div>
        <p className="font-semibold text-slate-950">{form.name}</p>
        <p className="text-xs text-slate-500">{form.id}</p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
  },
  {
    key: "fields",
    header: "Questions",
    render: (form) => `${form.fields.length} fields`,
  },
  {
    key: "status",
    header: "Status",
    render: (form) => (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {form.status}
      </span>
    ),
  },
];

export function FormsWorkspace() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">My Forms</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Operational Forms
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Build reusable operational checklists for tasks, audits, cleaning,
            inventory, and outlet execution.
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
        >
          New Form
        </button>
      </div>

      <EnterpriseDataTable
        title="Form Templates"
        description="Reusable forms that can be assigned into operational tasks."
        columns={columns}
        data={formTemplates}
        getRowId={(form) => form.id}
      />
    </main>
  );
}
