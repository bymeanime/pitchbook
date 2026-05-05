import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PitchBook - Book Game Venues & Join Tournaments",
  description: "Book futsal courts, turf grounds, basketball courts and more. Join tournaments, manage your team, and play your favorite sports.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const u = localStorage.getItem('pb_user');
                const t = localStorage.getItem('pb_token');
                if (u && t) {
                  window.__PB_AUTH = { user: JSON.parse(u), token: t };
                }
              } catch(e) {}
            `,
          }}
        />
      </body>
    </html>
  );
}
