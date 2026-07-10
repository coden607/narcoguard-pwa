import { InstallPrompt } from "@/components/pwa/install-prompt"
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Orbitron, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://narcoguard.app"),
  title: "NarcoGuard NG - Auto-Injection Overdose Prevention System",
  description:
    "Revolutionary wearable auto-injection concept powered by AI. The NarcoGuard NG watch is designed to detect and respond to overdose risk with instant naloxone deployment. Not just saving lives - transforming them. Created by Stephen Blanford.",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  keywords: [
    "naloxone",
    "overdose prevention",
    "auto-injection",
    "wearable technology",
    "NG",
    "NarcoGuard",
    "harm reduction",
    "life-saving",
    "AI health monitoring",
  ],
  authors: [{ name: "Stephen Blanford" }],
  creator: "Stephen Blanford",
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NarcoGuard NG",
  },
  openGraph: {
    title: "NarcoGuard NG - Auto-Injection System",
    description: "Revolutionary wearable auto-injection technology that saves lives. Join the movement.",
    type: "website",
    siteName: "NarcoGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "NarcoGuard NG - Auto-Injection System",
    description: "Revolutionary wearable auto-injection technology that saves lives. Join the movement.",
  },
}

export const viewport: Viewport = {
  themeColor: "#00d9ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/images/narcoguard-icon.jpeg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} ${orbitron.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <InstallPrompt />
      </body>
    </html>
  )
}
