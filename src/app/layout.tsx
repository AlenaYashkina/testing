import type { Metadata } from "next";

import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/cyrillic-500.css";
import "@fontsource/manrope/cyrillic-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/cyrillic-400.css";
import "@fontsource/ibm-plex-mono/cyrillic-500.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orders Command Center",
  description: "Мини-дашборд заказов на базе RetailCRM, Supabase и Telegram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
