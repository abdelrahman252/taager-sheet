import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Taager Analytics",
  description: "SKU Performance Dashboard",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
