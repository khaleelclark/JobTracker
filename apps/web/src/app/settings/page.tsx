export const dynamic = "force-dynamic";

import { DbPathPicker } from "@/components/DbPathPicker";

export default async function SettingsPage() {
  const currentUrl = process.env.DATABASE_URL ?? "";

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      <div className="card stack-md">
        <div>
          <h2>Database</h2>
          <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Path to the active SQLite database. In Docker, changes restart the container.
          </p>
        </div>
        <DbPathPicker currentUrl={currentUrl} />
      </div>
    </section>
  );
}
