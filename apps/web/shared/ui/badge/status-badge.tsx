import { Badge } from "./badge";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("active")
  ) {
    return <Badge variant="success">{status}</Badge>;
  }

  if (
    normalized.includes("progress") ||
    normalized.includes("pending") ||
    normalized.includes("review")
  ) {
    return <Badge variant="warning">{status}</Badge>;
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("overdue") ||
    normalized.includes("blocked") ||
    normalized.includes("inactive")
  ) {
    return <Badge variant="danger">{status}</Badge>;
  }

  if (normalized.includes("draft") || normalized.includes("open")) {
    return <Badge variant="info">{status}</Badge>;
  }

  return <Badge variant="neutral">{status}</Badge>;
}