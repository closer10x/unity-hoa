import { isRedirectError } from "next/dist/client/components/redirect-error";

export function rethrowIfRedirect(e: unknown): void {
  if (isRedirectError(e)) {
    throw e;
  }
}
