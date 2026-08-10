import { NextResponse } from "next/server";

/**
 * Current conditions for the community, for the header strip.
 *
 * OpenWeather is used when a key is configured. Without one it falls back to
 * Open-Meteo, which needs no account — so the header still works on a fresh
 * checkout and in preview builds where the key has not been added yet.
 *
 * Cached for fifteen minutes: the office does not need the temperature to
 * the minute, and both providers rate-limit free plans.
 */

/* Sofi Lakes, Katy, Texas, unless the environment says otherwise. When a
   second community is onboarded this should come from that community's own
   record rather than one setting. */
const LATITUDE = Number(process.env.WEATHER_LATITUDE ?? "29.7858");
const LONGITUDE = Number(process.env.WEATHER_LONGITUDE ?? "-95.8245");

const REVALIDATE_SECONDS = 900;

type Conditions = { tempF: number; label: string; kind: string; isDay: boolean };

/** One day ahead: the date as YYYY-MM-DD in the property's own zone. */
type ForecastDay = { date: string; highF: number; lowF: number; label: string; kind: string };

/** WMO codes from Open-Meteo, grouped into the states worth naming to staff. */
function fromWmoCode(code: number): { label: string; kind: string } {
  if (code === 0) return { label: "Clear", kind: "clear" };
  if (code === 1) return { label: "Mostly clear", kind: "clear" };
  if (code === 2) return { label: "Partly cloudy", kind: "cloud" };
  if (code === 3) return { label: "Overcast", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", kind: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", kind: "rain" };
  if (code >= 61 && code <= 67) return { label: "Rain", kind: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", kind: "snow" };
  if (code >= 80 && code <= 82) return { label: "Showers", kind: "rain" };
  if (code === 85 || code === 86) return { label: "Snow showers", kind: "snow" };
  if (code >= 95) return { label: "Thunderstorms", kind: "storm" };
  return { label: "—", kind: "cloud" };
}

/** OpenWeather groups conditions by the first digit of its condition id. */
function fromOpenWeatherId(id: number): string {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 400) return "rain";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return "clear";
  return "cloud";
}

async function fromOpenWeather(key: string): Promise<Conditions | null> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}` +
    `&lon=${LONGITUDE}&units=imperial&appid=${encodeURIComponent(key)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    main?: { temp?: number };
    weather?: { id?: number; main?: string; description?: string; icon?: string }[];
  };
  const temp = data.main?.temp;
  const first = data.weather?.[0];
  if (typeof temp !== "number" || !first || typeof first.id !== "number") return null;
  const described = first.description ?? first.main ?? "";
  return {
    tempF: Math.round(temp),
    label: described ? described.charAt(0).toUpperCase() + described.slice(1) : "—",
    kind: fromOpenWeatherId(first.id),
    // OpenWeather's icon code ends in "d" or "n" for day or night.
    isDay: !(first.icon ?? "").endsWith("n"),
  };
}

async function fromOpenMeteo(): Promise<Conditions | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}` +
    `&longitude=${LONGITUDE}&current=temperature_2m,weather_code,is_day` +
    `&temperature_unit=fahrenheit&timezone=America%2FChicago`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
  };
  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code;
  if (typeof temp !== "number" || typeof code !== "number") return null;
  return { tempF: Math.round(temp), ...fromWmoCode(code), isDay: data.current?.is_day !== 0 };
}

/**
 * The week ahead. Always Open-Meteo, even when an OpenWeather key is set:
 * OpenWeather's daily forecast is behind One Call, which the free plan does
 * not include, so keying off it would give some deployments a week and
 * others nothing. Current conditions still prefer OpenWeather.
 */
async function forecastFromOpenMeteo(): Promise<ForecastDay[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}` +
    `&longitude=${LONGITUDE}&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=7&temperature_unit=fahrenheit&timezone=America%2FChicago`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };
  const d = data.daily;
  if (!d?.time?.length) return [];
  return d.time.flatMap((date, i) => {
    const high = d.temperature_2m_max?.[i];
    const low = d.temperature_2m_min?.[i];
    const code = d.weather_code?.[i];
    if (typeof high !== "number" || typeof low !== "number" || typeof code !== "number") {
      return [];
    }
    return [{ date, highF: Math.round(high), lowF: Math.round(low), ...fromWmoCode(code) }];
  });
}

export async function GET() {
  try {
    const key = process.env.OPENWEATHER_API_KEY?.trim();
    /* Both go out together: the forecast never blocks the temperature the
       header actually shows, and a failed forecast is an empty list rather
       than a failed request. */
    const [conditions, forecast] = await Promise.all([
      (async () => (key ? await fromOpenWeather(key) : null) ?? (await fromOpenMeteo()))(),
      forecastFromOpenMeteo().catch(() => [] as ForecastDay[]),
    ]);
    if (!conditions) {
      return NextResponse.json({ error: "Weather is unavailable." }, { status: 502 });
    }
    return NextResponse.json({ ...conditions, forecast });
  } catch {
    return NextResponse.json({ error: "Weather is unavailable." }, { status: 502 });
  }
}
