"use client";

import { useState } from "react";

type Props = {
  value: string;
  label: string;
};

export function CopyFieldButton({ value, label }: Props) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/15 text-secondary hover:bg-secondary/25"
    >
      {done ? "Copied" : label}
    </button>
  );
}
