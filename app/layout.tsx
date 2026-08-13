import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { MATERIAL_SYMBOLS_URL } from "@/components/site/constants";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/* Public marketing site only — display + body faces for the (marketing) pages.
   Declared here so the variables exist on <html>; the portals never use them. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const libreFranklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Unity Grid Management | Homeowners Association",
    template: "%s | Unity Grid Management",
  },
  description:
    "Premier homeowners association management—amenities, resident services, and community governance.",
};

/**
 * Said out loud rather than left to the framework's default. Both portals are
 * built against the device width — the nav sheet, the stacking tables, the
 * intrinsic gutters all assume it — so the one line the whole layout depends
 * on should not be an implementation detail of the version of Next in the
 * lockfile. Zoom is left alone: pinching is how somebody with poor eyesight
 * reads a balance, and no layout is worth taking that away.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${ibmPlexMono.variable} ${bricolage.variable} ${libreFranklin.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_URL} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface font-body">
        {children}
      </body>
    </html>
  );
}
