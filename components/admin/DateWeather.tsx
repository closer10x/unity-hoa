"use client";

import React, { useEffect, useState } from "react";

import { color, font } from "@/lib/admin-portal/tokens";

/**
 * The date, the time and what it is doing outside, in the header. Times are
 * the community's own (Katy), not the viewer's, so an office working from
 * anywhere reads the same clock as the property.
 */

const ZONE = "America/Chicago";

/* Built once: constructing an Intl formatter is the costly part, and these
   take no dynamic input. */
const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: ZONE });
const MONTH_DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: ZONE });
const YEAR_FMT = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ZONE });
const DAY_NUM_FMT = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: ZONE });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: ZONE });

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

  if (!now) return null;

  const dayName = DAY_FMT.format(now);
  const monthDay = MONTH_DAY_FMT.format(now);
  const year = YEAR_FMT.format(now);
  const day = Number(DAY_NUM_FMT.format(now));
  const time = TIME_FMT.format(now);

  return (
    /* One line wherever it fits — which is every desktop width. It is allowed
       to wrap rather than hold the line, because an unbreakable strip pushes
       the whole page sideways on a phone: "Wednesday, September 30th, 2026"
       alone is wider than a 375px viewport. */
    <span style={{
      display: "flex", alignItems: "baseline", gap: 10,
      flexWrap: "wrap", minWidth: 0, flex: "1 1 auto",
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
