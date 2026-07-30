import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function ExecutionDetailPage() {
  redirect("/dashboard/tasks");
}
