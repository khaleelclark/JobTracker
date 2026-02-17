export const dynamic = "force-dynamic";

import { readControlFile } from "@/lib/fileStore";

export default async function SettingsPage() {
  const controlFile = await readControlFile();

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">Local control file and configuration context.</p>
      </header>

      <div className="card">
        <h2>Control File</h2>
        <pre className="control-file">{controlFile}</pre>
      </div>
    </section>
  );
}

