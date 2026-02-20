"use client";

import { Button, Typography } from "@mui/material";
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
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cardType}
          </Typography>
        </div>
        <span className={`pill priority-${priority}`}>{priority}</span>
      </div>
      <Typography variant="body2">{body}</Typography>
      <div className="button-row">
        <Button type="button" onClick={() => submit("dismiss")}>Dismiss</Button>
        <Button type="button" onClick={() => submit("archive")}>Archive</Button>
        <Button type="button" onClick={() => submit("snooze", 1)}>Snooze 1d</Button>
        <Button type="button" onClick={() => submit("snooze", 3)}>Snooze 3d</Button>
        <Button type="button" onClick={() => submit("snooze", 7)}>Snooze 7d</Button>
        <CopyPromptButton prompt={prompt} />
      </div>
    </article>
  );
}
