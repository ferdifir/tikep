import type { Metadata } from "next"
import "./globals.css"
import { TGProvider } from "./components/tg-provider"
import { ErrorBoundary } from "./components/error-boundary"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Tikep",
  description: "Short videos",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js?62" />
      </head>
      <body>
        <ErrorBoundary>
          <TGProvider>
            {children}
            <Toaster position="top-center" toastOptions={{ style: { background: "#27272a", color: "#fff", border: "1px solid #52525b" } }} />
          </TGProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
