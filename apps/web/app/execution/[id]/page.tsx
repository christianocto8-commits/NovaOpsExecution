import { redirect } from "next/navigation";

export default function ExecutionDetailPage() {
  redirect("/dashboard/tasks?mode=outlet");
}