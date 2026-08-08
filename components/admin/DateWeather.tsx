"use client";

import React, { useEffect, useState } from "react";

import { color, font } from "@/lib/admin-portal/tokens";

/**
 * The date, the time and what it is doing outside, in the header. Times are
 * the community's own (Katy), not the viewer's, so an office working from
 * anywhere reads the same clock as the property.
 */

const ZONE = "America/Chicago";

type Weather = { tempF: number; label: string; kind: string; isDay: boolean };

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

export default function DateWeather() {
  /* Rendered only after mount: the server and the browser would otherwise
     disagree about the current second and React would flag the mismatch. */
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
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

  if (!now) return null;

  const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: ZONE });
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: ZONE });
  const year = now.toLocaleDateString("en-US", { year: "numeric", timeZone: ZONE });
  const day = Number(now.toLocaleDateString("en-US", { day: "numeric", timeZone: ZONE }));
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: ZONE,
  });

  return (
    /* One line, never stacked: the date, the clock and the conditions read as
       a single sentence across the header. */
    <span style={{
      display: "flex", alignItems: "baseline", gap: 10,
      flexWrap: "nowrap", minWidth: 0, whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 14, color: color.ink }}>
        {dayName}, {monthDay.replace(String(day), ordinal(day))}, {year}
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 12, color: color.inkTertiary }}>
        {time}
      </span>
      {weather ? (
        <>
          <span aria-hidden style={{ color: color.inkQuaternary, fontSize: 12 }}>&middot;</span>
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
