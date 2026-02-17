"use client";

import { useState } from "react";

interface CopyPromptButtonProps {
  prompt?: string | null;
}

export function CopyPromptButton({ prompt }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!prompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy GPT Prompt"}
    </button>
  );
}
