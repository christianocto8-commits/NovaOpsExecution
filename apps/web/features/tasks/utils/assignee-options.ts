import type { IdentityUser } from "@/services/identity.service";
import type { OutletMember } from "@/services/task.service";

export type AssigneeSelection = "outlet_team" | "area_manager" | `user:${number}`;

export type AssigneeOption = {
  value: AssigneeSelection;
  label: string;
  assignedToId: number | null;
  assignee: string;
};

export function buildAssigneeOptions(args: {
  identityUsers: IdentityUser[];
  outletMembers: OutletMember[];
  selectedOutletIds: string[];
}): AssigneeOption[] {
  const options: AssigneeOption[] = [
    {
      value: "outlet_team",
      label: "Outlet Team",
      assignedToId: null,
      assignee: "Outlet Team",
    },
    {
      value: "area_manager",
      label: "Area Manager",
      assignedToId: null,
      assignee: "Area Manager",
    },
  ];

  const selectedOutletSet = new Set(args.selectedOutletIds);
  const memberByEmail = new Map(
    args.outletMembers.map((member) => [member.email.trim().toLowerCase(), member])
  );

  const scopedUsers = args.identityUsers.filter((user) => {
    if (!user.is_active) return false;

    const roleSlug = user.role.slug;
    if (roleSlug === "owner" || roleSlug === "admin") {
      return args.selectedOutletIds.length > 0;
    }

    if (roleSlug === "area_manager") {
      return user.assigned_outlets.some((outlet) => selectedOutletSet.has(outlet.id));
    }

    const primaryOutletId = user.outlet?.id;
    if (primaryOutletId && selectedOutletSet.has(primaryOutletId)) {
      return true;
    }

    return user.assigned_outlets.some((outlet) => selectedOutletSet.has(outlet.id));
  });

  const seenMemberIds = new Set<number>();

  scopedUsers.forEach((user) => {
    const member = memberByEmail.get(user.email.trim().toLowerCase());
    if (!member || seenMemberIds.has(member.id)) return;

    seenMemberIds.add(member.id);
    options.push({
      value: `user:${member.id}`,
      label: `${user.full_name} (${user.role.name})`,
      assignedToId: member.id,
      assignee: user.full_name,
    });
  });

  return options;
}

export function resolveAssigneeSelection(args: {
  assignedToId?: number | null;
  assignee?: string;
  assigneeSelection?: AssigneeSelection;
}): AssigneeSelection {
  if (args.assigneeSelection) {
    return args.assigneeSelection;
  }

  if (args.assignedToId != null) {
    return `user:${args.assignedToId}`;
  }

  if (args.assignee?.trim().toLowerCase() === "area manager") {
    return "area_manager";
  }

  return "outlet_team";
}

export function applyAssigneeSelection(
  selection: AssigneeSelection,
  options: AssigneeOption[]
): Pick<AssigneeOption, "assignedToId" | "assignee"> {
  const matched = options.find((option) => option.value === selection);
  if (matched) {
    return {
      assignedToId: matched.assignedToId,
      assignee: matched.assignee,
    };
  }

  return {
    assignedToId: null,
    assignee: "Outlet Team",
  };
}
