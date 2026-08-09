import { DraftCenterWorkspace } from "@/features/drafts/components/draft-center-workspace";
import { AuthGuard } from "@/lib/auth/auth-guard";

export default function DraftsPage() {
  return (
    <AuthGuard>
      <DraftCenterWorkspace />
    </AuthGuard>
  );
}
