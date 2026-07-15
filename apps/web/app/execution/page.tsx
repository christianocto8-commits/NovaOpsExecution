import { redirect } from "next/navigation";

export default function ExecutionPage() {
  redirect("/dashboard/tasks?mode=outlet");
}