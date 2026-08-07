"use client";

/**
 * Loads Plaid Link's script on demand and opens the account-picker flow.
 * The link token comes from the getBankLinkToken server action; the public
 * token handed back here goes straight to connectBankAccount and is never
 * stored client-side.
 */

type PlaidHandler = { open: () => void; exit: () => void };

type PlaidGlobal = {
  create: (config: {
    token: string;
    onSuccess: (publicToken: string, metadata: { institution?: { name?: string } | null }) => void;
    onExit: (err: { display_message?: string; error_message?: string } | null) => void;
  }) => PlaidHandler;
};

declare global {
  interface Window {
    Plaid?: PlaidGlobal;
  }
}

const SCRIPT_SRC = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

let loading: Promise<PlaidGlobal> | null = null;

function loadPlaid(): Promise<PlaidGlobal> {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Plaid) resolve(window.Plaid);
      else reject(new Error("Plaid Link failed to initialize."));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Plaid Link — check the network and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openPlaidLink(
  linkToken: string,
  callbacks: {
    onSuccess: (publicToken: string, institutionName: string) => void;
    onExit?: (message: string | null) => void;
  },
): Promise<void> {
  const plaid = await loadPlaid();
  plaid
    .create({
      token: linkToken,
      onSuccess: (publicToken, metadata) =>
        callbacks.onSuccess(publicToken, metadata.institution?.name ?? ""),
      onExit: (err) =>
        callbacks.onExit?.(err ? (err.display_message ?? err.error_message ?? null) : null),
    })
    .open();
}
