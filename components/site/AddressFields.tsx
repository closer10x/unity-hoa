"use client";

/**
 * Structured address input required by project rule 6: street number, street
 * name, unit/lot, city, state (Texas by default) and ZIP as separate fields.
 */

export type Address = {
  streetNumber: string;
  streetName: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
};

export const EMPTY_ADDRESS: Address = {
  streetNumber: "",
  streetName: "",
  unit: "",
  city: "",
  state: "Texas",
  zip: "",
};

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";

const US_STATES = [
  "Texas",
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

type AddressFieldsProps = {
  /** Prefix for input ids so two address blocks can coexist on one page. */
  idPrefix: string;
  value: Address;
  onChange: (next: Address) => void;
  /**
   * Property addresses are Texas-only per rule 6 — Texas is the default
   * everywhere and the sole option for properties. Mailing addresses stay open.
   */
  texasOnly?: boolean;
};

export function AddressFields({
  idPrefix,
  value,
  onChange,
  texasOnly = false,
}: AddressFieldsProps) {
  const set = (key: keyof Address) => (v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] justify-items-start gap-4">
        <label className="block w-full" htmlFor={`${idPrefix}-street-number`}>
          <span className={LABEL}>Street number</span>
          <input
            id={`${idPrefix}-street-number`}
            className={FIELD}
            inputMode="numeric"
            autoComplete="off"
            placeholder="7880"
            value={value.streetNumber}
            onChange={(e) => set("streetNumber")(e.target.value)}
          />
        </label>

        <label className="block w-full" htmlFor={`${idPrefix}-street-name`}>
          <span className={LABEL}>Street name</span>
          <input
            id={`${idPrefix}-street-name`}
            className={FIELD}
            autoComplete="off"
            placeholder="Morrison Road"
            value={value.streetName}
            onChange={(e) => set("streetName")(e.target.value)}
          />
        </label>

        <label className="block w-full" htmlFor={`${idPrefix}-unit`}>
          <span className={LABEL}>
            Unit / lot{" "}
            <span className="text-outline">(optional)</span>
          </span>
          <input
            id={`${idPrefix}-unit`}
            className={FIELD}
            autoComplete="off"
            placeholder="Lot 14"
            value={value.unit}
            onChange={(e) => set("unit")(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] justify-items-start gap-4">
        <label className="block w-full" htmlFor={`${idPrefix}-city`}>
          <span className={LABEL}>City</span>
          <input
            id={`${idPrefix}-city`}
            className={FIELD}
            autoComplete="off"
            placeholder="Katy"
            value={value.city}
            onChange={(e) => set("city")(e.target.value)}
          />
        </label>

        <label className="block w-full" htmlFor={`${idPrefix}-state`}>
          <span className={LABEL}>State</span>
          <select
            id={`${idPrefix}-state`}
            className={`${FIELD} cursor-pointer appearance-none`}
            value={value.state}
            disabled={texasOnly}
            onChange={(e) => set("state")(e.target.value)}
          >
            {(texasOnly ? (["Texas"] as const) : US_STATES).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block w-full" htmlFor={`${idPrefix}-zip`}>
          <span className={LABEL}>ZIP</span>
          <input
            id={`${idPrefix}-zip`}
            className={FIELD}
            inputMode="numeric"
            autoComplete="off"
            placeholder="77493"
            value={value.zip}
            onChange={(e) => set("zip")(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export function isAddressComplete(a: Address): boolean {
  return Boolean(
    a.streetNumber.trim() &&
      a.streetName.trim() &&
      a.city.trim() &&
      a.state.trim() &&
      a.zip.trim(),
  );
}
