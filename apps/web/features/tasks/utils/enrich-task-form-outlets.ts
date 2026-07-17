import type { TaskFormState } from "@/features/tasks/types";

type OutletOption = {
  id: string;
  name: string;
};

export function enrichTaskFormOutlets(
  form: TaskFormState,
  outlets: OutletOption[]
): TaskFormState {
  if (outlets.length === 0) {
    return form;
  }

  const defaultOutlet = outlets[0];

  if (form.recurrence === "once") {
    if (form.outletId) {
      return form;
    }

    return {
      ...form,
      outlet: defaultOutlet.name,
      outletId: defaultOutlet.id,
      targetOutlets: [defaultOutlet.name],
      targetOutletIds: [defaultOutlet.id],
    };
  }

  if (form.targetOutletIds && form.targetOutletIds.length > 0) {
    return form;
  }

  return {
    ...form,
    outlet: defaultOutlet.name,
    outletId: defaultOutlet.id,
    targetOutlets: [defaultOutlet.name],
    targetOutletIds: [defaultOutlet.id],
  };
}
