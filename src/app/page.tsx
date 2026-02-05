import { Suspense } from "react";

import { SpectatorShell } from "@/components/spectator/SpectatorShell";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading…</main>}>
      <SpectatorShell />
    </Suspense>
  );
}
