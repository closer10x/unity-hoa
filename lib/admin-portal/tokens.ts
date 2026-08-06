/**
 * Unity Grid design tokens.
 *
 * Colors are authored in oklch() — the palette is perceptually uniform and
 * depends on it. Do not convert to hex in the app; hex equivalents exist only
 * in the handoff README for tooling that cannot parse oklch.
 */

export const color = {
  bg: "oklch(0.972 0.006 130)",
  surface: "oklch(0.99 0.004 130)",
  surfaceSunken: "oklch(0.985 0.005 135)",
  surfaceMuted: "oklch(0.978 0.006 140)",
  hairline: "oklch(0.9 0.01 140)",
  hairlineSoft: "oklch(0.95 0.006 140)",
  borderInput: "oklch(0.86 0.012 145)",
  accent: "oklch(0.42 0.05 155)",
  accentHover: "oklch(0.34 0.05 155)",
  accentTint: "oklch(0.955 0.018 150)",
  accentTintBorder: "oklch(0.89 0.022 150)",
  chipOn: "oklch(0.93 0.03 152)",
  chipOnBorder: "oklch(0.82 0.04 152)",
  chipOnText: "oklch(0.36 0.05 155)",
  ink: "oklch(0.26 0.014 150)",
  inkSecondary: "oklch(0.45 0.012 150)",
  inkTertiary: "oklch(0.52 0.012 150)",
  inkQuaternary: "oklch(0.56 0.015 150)",
  positive: "oklch(0.45 0.06 155)",
  attention: "oklch(0.5 0.09 60)",
  critical: "oklch(0.48 0.11 30)",
  destructive: "oklch(0.5 0.09 30)",
  neutral: "oklch(0.5 0.03 155)",
  confirmBg: "oklch(0.965 0.014 148)",
  rowHover: "oklch(0.965 0.01 145)",
} as const;

export const calColor: Record<string, string> = {
  Meeting: "oklch(0.5 0.06 155)",
  Inspection: "oklch(0.52 0.08 250)",
  Booking: "oklch(0.5 0.03 155)",
  Legal: "oklch(0.48 0.11 30)",
  Community: "oklch(0.55 0.09 60)",
};

export const calTint: Record<string, string> = {
  Meeting: "oklch(0.955 0.022 155)",
  Inspection: "oklch(0.95 0.025 250)",
  Booking: "oklch(0.96 0.012 155)",
  Legal: "oklch(0.955 0.035 30)",
  Community: "oklch(0.96 0.035 70)",
};

export const font = {
  sans: "'Instrument Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
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
