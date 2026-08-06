import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Unity Grid Management | Homeowners Association",
    template: "%s | Unity Grid Management",
  },
  description:
    "Premier homeowners association management—amenities, resident services, and community governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
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
