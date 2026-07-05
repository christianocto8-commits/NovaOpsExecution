import { Plus } from "lucide-react";
import { Button, Input } from "@/shared/ui";
import { Modal } from "@/shared/ui/overlay/modal";
import { TaskFormState } from "../types";

type TaskFormDialogProps = {
  open: boolean;
  editingTaskId?: string | null;
  form: TaskFormState;
  onClose: () => void;
  onFormChange: (form: TaskFormState) => void;
  onCreate: () => void;
};

export function TaskFormDialog({
  open,
  editingTaskId,
  form,
  onClose,
  onFormChange,
  onCreate,
}: TaskFormDialogProps) {
  const isEditing = Boolean(editingTaskId);

  return (
    <Modal
      open={open}
      title={isEditing ? "Edit Task" : "Create New Task"}
      description={
        isEditing ? "Update operational assignment details." : "Add a new operational assignment."
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
            {isEditing ? "Update Task" : "Create Task"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Task title"
          value={form.title}
          onChange={(event) => onFormChange({ ...form, title: event.target.value })}
        />

        <Input
          placeholder="Assignee"
          value={form.assignee}
          onChange={(event) => onFormChange({ ...form, assignee: event.target.value })}
        />

        <Input
          placeholder="Outlet"
          value={form.outlet}
          onChange={(event) => onFormChange({ ...form, outlet: event.target.value })}
        />

        <Input
          placeholder="Due"
          value={form.due}
          onChange={(event) => onFormChange({ ...form, due: event.target.value })}
        />
      </div>

      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(event) => onFormChange({ ...form, description: event.target.value })}
        className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
      />
    </Modal>
  );
}
