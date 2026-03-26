import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { MATERIAL_SYMBOLS_URL } from "@/components/site/constants";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
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
