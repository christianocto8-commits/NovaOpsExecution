import { redirect } from "next/navigation";

export default function HistoryPage() {
  redirect("/dashboard/reports?tab=riwayat");
}
