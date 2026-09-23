import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Meskat Alam — Vibe Coder",
  description:
    "Meskat Alam builds browser-native experiences that feel alive — physics, canvas craft and interfaces with soul. Currently accepting new missions.",
  keywords: ["Meskat Alam", "Vibe Coder", "Creative Developer", "Three.js", "Canvas API", "Portfolio"],
  authors: [{ name: "Meskat Alam" }],
  openGraph: {
    title: "Meskat Alam — Vibe Coder",
    description: "Browser-native experiences that feel alive.",
    siteName: "Meskat Alam",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#08060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
