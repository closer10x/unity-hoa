import "server-only";

/**
 * Thin Plaid REST client. Plaid's API is plain JSON-over-POST, so this calls
 * it directly rather than pulling in the SDK.
 *
 * Configure with PLAID_CLIENT_ID, PLAID_SECRET and PLAID_ENV ("sandbox" or
 * "production") in .env.local. Until those are set the bank-sync UI shows a
 * setup notice and every function here throws.
 */

const HOSTS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  production: "https://production.plaid.com",
};

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET?.trim());
}

async function plaid<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = process.env.PLAID_CLIENT_ID?.trim();
  const secret = process.env.PLAID_SECRET?.trim();
  if (!clientId || !secret) {
    throw new Error("Plaid is not configured (PLAID_CLIENT_ID / PLAID_SECRET)");
  }
  const env = process.env.PLAID_ENV?.trim().toLowerCase() || "sandbox";
  const host = HOSTS[env] ?? HOSTS.sandbox;

  const res = await fetch(`${host}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error_code?: string; error_message?: string };
  if (!res.ok || json.error_code) {
    throw new Error(`Plaid ${path}: ${json.error_code ?? res.status} ${json.error_message ?? ""}`.trim());
  }
  return json;
}

export async function createLinkToken(userId: string): Promise<string> {
  const json = await plaid<{ link_token: string }>("/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Unity Grid",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  });
  return json.link_token;
}

export async function exchangePublicToken(
  publicToken: string,
): Promise<{ access_token: string; item_id: string }> {
  return plaid("/item/public_token/exchange", { public_token: publicToken });
}

export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: { available: number | null; current: number | null };
};

export async function getAccounts(accessToken: string): Promise<PlaidAccount[]> {
  const json = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", {
    access_token: accessToken,
  });
  return json.accounts;
}

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  /** Plaid convention: positive = money out, negative = money in. */
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  personal_finance_category: { primary: string; detailed: string } | null;
};

export type SyncResult = {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
};

export async function transactionsSync(accessToken: string, cursor: string): Promise<SyncResult> {
  return plaid("/transactions/sync", {
    access_token: accessToken,
    cursor: cursor || undefined,
    count: 500,
  });
}

export async function removeItem(accessToken: string): Promise<void> {
  await plaid("/item/remove", { access_token: accessToken });
}
