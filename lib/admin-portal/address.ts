import type { Address } from "./types";

export const emptyAddress = (): Address => ({
  streetNo: "", street: "", unit: "", city: "", state: "Texas", zip: "",
});

/**
 * Product rule: addresses are structured everywhere — never a single free-text
 * field. This joins the parts for display only.
 */
export function formatAddress(a: Address): string {
  const line1 = [a.streetNo.trim(), a.street.trim()].filter(Boolean).join(" ");
  const withUnit = [line1, a.unit.trim()].filter(Boolean).join(" · ");
  const tail = [a.city.trim(), [a.state.trim(), a.zip.trim()].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
  return [withUnit, tail].filter(Boolean).join(", ");
}

export function isAddressComplete(a: Address): boolean {
  return Boolean(a.streetNo.trim() && a.street.trim() && a.city.trim() && a.zip.trim());
}
