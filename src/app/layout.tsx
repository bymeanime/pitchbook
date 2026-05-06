import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import AppClerkProvider from "@/components/ClerkProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://pitchbook-eta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PitchBook - Book Game Venues & Join Tournaments",
    template: "%s | PitchBook",
  },
  description:
    "Book futsal courts, turf grounds, basketball courts and more across Nepal. Join tournaments, manage your team, and play your favorite sports. Easy booking, instant confirmation.",
  keywords: [
    "futsal booking",
    "sports venue",
    "book futsal court",
    "sports venue Nepal",
    "Kathmandu futsal",
    "basketball court booking",
    "badminton court",
    "football turf",
    "sports tournament",
    "venue booking Nepal",
    "game venue booking",
    "PitchBook",
  ],
  authors: [{ name: "PitchBook" }],
  creator: "PitchBook",
  publisher: "PitchBook",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "PitchBook",
    title: "PitchBook - Book Game Venues & Join Tournaments",
    description:
      "Book futsal courts, turf grounds, basketball courts and more across Nepal. Join tournaments, manage your team, and play your favorite sports.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "PitchBook - Game Venue Booking Platform",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "PitchBook - Book Game Venues & Join Tournaments",
    description:
      "Book futsal courts, turf grounds, basketball courts and more across Nepal.",
    images: ["/icons/icon-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PitchBook",
    url: SITE_URL,
    description:
      "Book futsal courts, turf grounds, basketball courts and more across Nepal. Join tournaments, manage your team, and play your favorite sports.",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "NPR",
    },
    areaServed: {
      "@type": "Country",
      name: "Nepal",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#16a34a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AppClerkProvider>
          <AnalyticsProvider />
          {children}
          <Toaster />
        </AppClerkProvider>
      </body>
    </html>
  );
}
