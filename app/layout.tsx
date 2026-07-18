import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { TelegramStartRouter } from "@/components/telegram-start-router";

export const metadata: Metadata = {
  title: "Tikep - Katalog Layanan Digital",
  description: "Katalog sosial untuk menemukan, merekomendasikan, dan melaporkan layanan digital.",
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
        <AppProvider>
          <TelegramStartRouter />
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
