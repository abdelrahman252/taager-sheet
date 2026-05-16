import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Taager Analytics",
  description: "SKU Performance Dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
