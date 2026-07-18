import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { TelegramAccessGate } from "@/components/telegram-access-gate";
import { TelegramStartRouter } from "@/components/telegram-start-router";
import { appVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Tikep - Katalog Layanan Digital",
  description: "Katalog sosial untuk menemukan, merekomendasikan, dan melaporkan layanan digital.",
  other: {
    "app-version": appVersion,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <TelegramAccessGate>
          <AppProvider>
            <TelegramStartRouter />
            <AppShell>{children}</AppShell>
          </AppProvider>
        </TelegramAccessGate>
      </body>
    </html>
  );
}
