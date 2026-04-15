import { AppShell } from "@/components/layout/app-shell";
import { PageShell } from "@/components/patterns/page-shell";
import { ConnectionWorkspace } from "@/features/connection/ui/connection-workspace";

import { getConnectionSessionSnapshot } from "@/features/connection/session/connection-session";

export default async function Home() {
  const initialSessionSnapshot = await getConnectionSessionSnapshot();

  return (
    <AppShell>
      <PageShell>
        <ConnectionWorkspace
          initialConnectionString={initialSessionSnapshot.activeConnectionString}
          initialRecentConnectionStrings={initialSessionSnapshot.recentConnectionStrings}
        />
      </PageShell>
    </AppShell>
  );
}
