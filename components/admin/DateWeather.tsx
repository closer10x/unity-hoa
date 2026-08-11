"use client";

import React, { useEffect, useRef, useState } from "react";

import { color, font, radius } from "@/lib/admin-portal/tokens";
import { useOnScreenPanel } from "./ui";

/**
 * The date, the time and what it is doing outside, in the header. Times are
 * the community's own (Katy), not the viewer's, so an office working from
 * anywhere reads the same clock as the property.
 */

const ZONE = "America/Chicago";

/* Built once: constructing an Intl formatter is the costly part, and these
   take no dynamic input. */
const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: ZONE });
/* Phone-width date: "Mon, Aug 10". The long form — "Monday, August 10th,
   2026" — is wider than a 375px viewport on its own, which pushed the header
   into three stacked rows and cost a third of the screen before any content. */
const SHORT_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", timeZone: ZONE,
});
const MONTH_DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: ZONE });
const YEAR_FMT = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ZONE });
const DAY_NUM_FMT = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: ZONE });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ZONE });

type ForecastDay = { date: string; highF: number; lowF: number; label: string; kind: string };
type Weather = {
  tempF: number; label: string; kind: string; isDay: boolean;
  forecast?: ForecastDay[];
};

/* The API returns YYYY-MM-DD in the property's zone. Formatting it back
   through a Date would shift it a day for anyone west of Katy, so the parts
   are read straight off the string and only the weekday is computed — from a
   noon UTC instant, far enough from either midnight to be safe. */
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

function forecastDayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return WEEKDAY_FMT.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Colour emoji, at the owner's request — a deliberate exception to the
 * no-icons, no-emoji rule, and the only one in the portal. Weather is the one
 * thing here that is not association data, so it reads as a glance-at-it
 * detail rather than part of the record.
 */
const WEATHER_EMOJI: Record<string, string> = {
  clear: "\u2600\uFE0F",
  cloud: "\u26C5",
  rain: "\uD83C\uDF27\uFE0F",
  snow: "\uD83C\uDF28\uFE0F",
  storm: "\u26C8\uFE0F",
  fog: "\uD83C\uDF2B\uFE0F",
};

/* After dark a sun is simply wrong. Only the sky-facing states change —
   rain, snow, storms and fog read the same at any hour. */
const NIGHT_EMOJI: Record<string, string> = {
  clear: "\uD83C\uDF19",
  cloud: "\u2601\uFE0F",
};

function weatherEmoji(w: Weather): string {
  if (!w.isDay && NIGHT_EMOJI[w.kind]) return NIGHT_EMOJI[w.kind];
  return WEATHER_EMOJI[w.kind] ?? WEATHER_EMOJI.cloud;
}

export default function DateWeather({ compact = false }: { compact?: boolean }) {
  /* Rendered only after mount: the server and the browser would otherwise
     disagree about the current second and React would flag the mismatch. */
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const forecastRef = useRef<HTMLSpanElement>(null);
  const forecastBtnRef = useRef<HTMLButtonElement>(null);
  const forecastPanel = useOnScreenPanel(forecastOpen, forecastBtnRef);

  useEffect(() => {
    /* The clock shows minutes, so it wakes on the minute boundary rather than
       every second — a tab left open all day re-renders 1,440 times, not
       86,400. */
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const t = new Date();
      setNow(t);
      timer = setTimeout(schedule, 60_000 - (t.getSeconds() * 1000 + t.getMilliseconds()));
    };
    /* Deferred a tick so the first paint matches the server's empty render
       and the clock does not set state during the effect body itself. */
    timer = setTimeout(schedule, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/weather")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Weather | null) => {
          if (alive && d && typeof d.tempF === "number") setWeather(d);
        })
        .catch(() => {
          // The strip simply shows the date and time without it.
        });
    };
    load();
    const refresh = setInterval(load, 15 * 60 * 1000);
    return () => { alive = false; clearInterval(refresh); };
  }, []);

  // Same dismissal as the profile menu: click away or press Escape.
  useEffect(() => {
    if (!forecastOpen) return;
    const onDown = (e: MouseEvent) => {
      if (forecastRef.current && !forecastRef.current.contains(e.target as Node)) {
        setForecastOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setForecastOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [forecastOpen]);

  if (!now) return null;

  const dayName = DAY_FMT.format(now);
  const monthDay = MONTH_DAY_FMT.format(now);
  const year = YEAR_FMT.format(now);
  const day = Number(DAY_NUM_FMT.format(now));
  const time = TIME_FMT.format(now);
  const forecast = weather?.forecast ?? [];

  return (
    /* One line wherever it fits — which is every desktop width. It is allowed
       to wrap rather than hold the line, because an unbreakable strip pushes
       the whole page sideways on a phone: "Wednesday, September 30th, 2026"
       alone is wider than a 375px viewport. */
    <span style={{
      display: "flex", alignItems: "baseline", gap: 10,
      flexWrap: "wrap", minWidth: 0,
      /* On a phone it is one chip among three on a single row, so it must not
         claim the leftover space the way it does on a wide header. */
      flex: compact ? "0 0 auto" : "1 1 auto",
    }}>
      {/* The date is the first thing to go on a phone: it cost a whole
          header row, and the device shows one on its own lock screen. The
          conditions stay because they are the one thing here you cannot get
          from the phone itself. */}
      {compact ? null : (
        <span style={{ fontSize: 14, color: color.ink }}>
          {`${dayName}, ${monthDay.replace(String(day), ordinal(day))}, ${year}`}
        </span>
      )}
      {/* The phone puts the time in its own status bar an inch above this,
          so repeating it costs a header row for nothing. */}
      {compact ? null : (
        <span style={{ fontFamily: font.mono, fontSize: 12, color: color.inkTertiary }}>
          {time}
        </span>
      )}
      {weather ? (
        <>
          {compact ? null : (
            <span aria-hidden style={{ color: color.inkQuaternary, fontSize: 12 }}>&middot;</span>
          )}
          {/* The conditions become the control that opens the week, so the
              strip gains a forecast without gaining a second thing to look
              at. With no forecast to show it stays plain text. */}
          <span ref={forecastRef} style={{ position: "relative", display: "inline-flex" }}>
            {forecast.length > 0 ? (
              <button
                type="button"
                ref={forecastBtnRef}
                onClick={() => setForecastOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={forecastOpen}
                aria-label={`${weather.label}, ${weather.tempF} degrees Fahrenheit. Show the seven-day forecast.`}
                style={{
                  display: "inline-flex", alignItems: "baseline", gap: 8,
                  font: "inherit", cursor: "pointer",
                  background: forecastOpen ? color.surfaceSunken : "none",
                  border: `1px solid ${forecastOpen ? color.borderInput : "transparent"}`,
                  borderRadius: 999, padding: "3px 9px", margin: "-3px 0",
                }}
              >
                <span style={{ fontFamily: font.mono, fontSize: 12, color: color.inkTertiary }}>
                  {weather.tempF}&deg;F
                </span>
                <span aria-hidden style={{ fontSize: 17, lineHeight: 1, flex: "0 0 auto" }}>
                  {weatherEmoji(weather)}
                </span>
              </button>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: font.mono, fontSize: 12, color: color.inkTertiary }}>
                  {weather.tempF}&deg;F
                </span>
                <span
                  role="img"
                  aria-label={`${weather.label}, ${weather.tempF} degrees Fahrenheit`}
                  title={`${weather.label}, ${weather.tempF}\u00B0F`}
                  style={{ fontSize: 17, lineHeight: 1, flex: "0 0 auto" }}
                >
                  {weatherEmoji(weather)}
                </span>
              </span>
            )}

            {forecastOpen ? (
              <div
                role="dialog"
                aria-label="Seven-day forecast"
                style={{
                  position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 30,
                  minWidth: 250, padding: "10px 6px 6px",
                  ...forecastPanel,
                  background: color.surface, border: `1px solid ${color.borderInput}`,
                  borderRadius: radius.lg,
                  boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                }}
              >
                <span style={{
                  display: "block", padding: "0 12px 8px",
                  fontFamily: font.mono, fontSize: 10.5, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: color.inkQuaternary,
                }}>
                  Next seven days
                </span>
                {forecast.map((d, i) => (
                  <span
                    key={d.date}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      alignItems: "center", gap: 12,
                      padding: "7px 12px", borderRadius: 8,
                      background: i === 0 ? color.surfaceSunken : "none",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <span aria-hidden style={{ fontSize: 15, lineHeight: 1, flex: "0 0 auto" }}>
                        {WEATHER_EMOJI[d.kind] ?? WEATHER_EMOJI.cloud}
                      </span>
                      <span style={{
                        fontSize: 13.5, color: color.ink, fontWeight: i === 0 ? 600 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {forecastDayLabel(d.date, i)}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: color.inkQuaternary, whiteSpace: "nowrap" }}>
                      {d.label}
                    </span>
                    {/* High first, low second, both mono so the column of
                        numbers lines up down the list. */}
                    <span style={{ fontFamily: font.mono, fontSize: 12, whiteSpace: "nowrap" }}>
                      <span style={{ color: color.ink }}>{d.highF}&deg;</span>
                      <span style={{ color: color.inkQuaternary }}> / {d.lowF}&deg;</span>
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </span>
        </>
      ) : null}
    </span>
  );
}

function ordinal(n: number): string {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}
