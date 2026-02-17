"use client";

import { useRouter } from "next/navigation";
import { CopyPromptButton } from "./CopyPromptButton";

interface UiCardProps {
  id: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high";
  cardType: string;
  prompt?: string | null;
}

export function UiCard({ id, title, body, priority, cardType, prompt }: UiCardProps) {
  const router = useRouter();

  async function submit(action: "dismiss" | "archive" | "snooze", snoozeDays?: number) {
    await fetch(`/api/ui-cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, snoozeDays }),
    });

    router.refresh();
  }

  return (
    <article className="card interactive reveal">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          <div className="muted">{cardType}</div>
        </div>
        <span className={`pill priority-${priority}`}>{priority}</span>
      </div>
      <p>{body}</p>
      <div className="button-row">
        <button type="button" onClick={() => submit("dismiss")}>Dismiss</button>
        <button type="button" onClick={() => submit("archive")}>Archive</button>
        <button type="button" onClick={() => submit("snooze", 1)}>Snooze 1d</button>
        <button type="button" onClick={() => submit("snooze", 3)}>Snooze 3d</button>
        <button type="button" onClick={() => submit("snooze", 7)}>Snooze 7d</button>
        <CopyPromptButton prompt={prompt} />
      </div>
    </article>
  );
}
