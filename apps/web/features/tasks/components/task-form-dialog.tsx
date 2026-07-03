import { Plus, X } from "lucide-react";
import { Button, Input } from "@/shared/ui";
import { TaskFormState } from "../types";

type TaskFormDialogProps = {
  open: boolean;
  form: TaskFormState;
  onClose: () => void;
  onFormChange: (form: TaskFormState) => void;
  onCreate: () => void;
};

export function TaskFormDialog({
  open,
  form,
  onClose,
  onFormChange,
  onCreate,
}: TaskFormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-16 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Create New Task
            </h2>
            <p className="text-sm text-slate-500">
              Add a new operational assignment.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Task title"
            value={form.title}
            onChange={(event) =>
              onFormChange({ ...form, title: event.target.value })
            }
          />

          <Input
            placeholder="Assignee"
            value={form.assignee}
            onChange={(event) =>
              onFormChange({ ...form, assignee: event.target.value })
            }
          />

          <Input
            placeholder="Outlet"
            value={form.outlet}
            onChange={(event) =>
              onFormChange({ ...form, outlet: event.target.value })
            }
          />

          <Input
            placeholder="Due"
            value={form.due}
            onChange={(event) =>
              onFormChange({ ...form, due: event.target.value })
            }
          />
        </div>

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) =>
            onFormChange({ ...form, description: event.target.value })
          }
          className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={onCreate}
          >
            Create Task
          </Button>
        </div>
      </div>
    </div>
  );
}
