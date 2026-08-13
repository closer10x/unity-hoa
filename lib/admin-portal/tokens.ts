/**
 * Unity Grid design tokens.
 *
 * The olive palette the public site and the resident portal already use, now
 * the admin portal's too — one product, one set of colours. The values are
 * the same hexes as the `--color-*` tokens in globals.css; they live here as
 * well because the portal styles inline rather than through Tailwind classes.
 *
 * The token *names* are unchanged on purpose. Fifteen sections style against
 * `color.inkTertiary` and `color.hairline`; remapping the values converts all
 * of them at once, where renaming would mean editing several thousand style
 * objects and missing some.
 */

export const color = {
  bg: "#F4F3EE",
  surface: "#FFFFFF",
  surfaceSunken: "#FAF9F5",
  surfaceMuted: "#F4F3EE",
  hairline: "#E3E0D5",
  hairlineSoft: "#E9E7DC",
  borderInput: "#D8D4C6",
  accent: "#333D26",
  accentHover: "#5A6B3C",
  accentTint: "#E9EBDD",
  accentTintBorder: "#DDE3C6",
  chipOn: "#333D26",
  chipOnBorder: "#333D26",
  chipOnText: "#FFFFFF",
  ink: "#333D26",
  inkSecondary: "#4F5645",
  inkTertiary: "#7C8272",
  inkQuaternary: "#9BA091",
  positive: "#5A6B3C",
  attention: "#8A6A2F",
  critical: "#A3452F",
  destructive: "#A3452F",
  neutral: "#7C8272",
  confirmBg: "#E9EBDD",
  rowHover: "#FAF9F5",
} as const;

/* The calendar keeps five distinguishable hues — a month grid is the one
   place colour carries meaning that a label cannot — pulled toward the olive
   family so they sit on paper rather than on the old sage. */
export const calColor: Record<string, string> = {
  Meeting: "#5A6B3C",
  Inspection: "#4A6076",
  Booking: "#7C8272",
  Legal: "#A3452F",
  Community: "#8A6A2F",
};

export const calTint: Record<string, string> = {
  Meeting: "#E9EBDD",
  Inspection: "#E4EAEF",
  Booking: "#F1F0EA",
  Legal: "#F6E3DC",
  Community: "#F2E9D6",
};

export const font = {
  sans: "var(--font-franklin), ui-sans-serif, system-ui, sans-serif",
  /* Refs, amounts and timestamps stay monospaced — an office scans columns
     of them, which is the one habit worth keeping from the old set. */
  mono: "var(--font-ibm-plex-mono), ui-monospace, monospace",
  display: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
} as const;

/** Fluid padding used by the shell, card headers and rows. */
export const pad = {
  shell: "clamp(16px, 3vw, 32px)",
  card: "clamp(16px, 2.4vw, 24px)",
  gap: "clamp(20px, 3vw, 28px)",
} as const;

export const radius = {
  pill: "999px", sm: "8px", md: "10px", lg: "12px", xl: "14px", card: "16px",
} as const;

/** The single JS breakpoint: below this the sidebar becomes a nav sheet. */
export const MOBILE_BREAKPOINT = 760;

/**
 * Every data row uses this grid. Fixed pixel tracks were tried and collapsed
 * cells to unreadable widths at laptop sizes — auto-fit with a 170px floor
 * reflows into fewer, wider tracks instead.
 */
export const rowGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  justifyItems: "start",
  gap: "8px 18px",
  alignItems: "baseline",
} as const;

export const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
} as const;
