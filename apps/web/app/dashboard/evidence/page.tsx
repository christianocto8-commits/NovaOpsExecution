import { redirect } from "next/navigation";

export default function EvidencePage() {
  redirect("/dashboard/reports?tab=bukti");
}
