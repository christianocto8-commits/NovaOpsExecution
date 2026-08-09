import { redirect } from "next/navigation";

export async function generateStaticParams() {
  return [{ id: "legacy" }];
}

export const dynamicParams = false;

export const dynamic = "force-static";

export default function ExecutionDetailPage() {
  redirect("/dashboard/tasks");
}
