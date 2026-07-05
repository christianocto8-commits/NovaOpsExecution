import { useQuery } from "@tanstack/react-query";
import { getReports } from "@/features/reports/services/reports-api";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });
}
