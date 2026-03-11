import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THE BEST PARTIES | Go with your heart ❤️ 🎉",
  description: "Your gateway to the most unforgettable nightlife experiences. World-class DJs, electric crowds, and unforgettable vibes.",
  keywords: ["parties", "nightlife", "events", "DJ", "music", "tickets", "hospitality"],
  openGraph: {
    title: "THE BEST PARTIES",
    description: "Go with your heart ❤️ 🎉",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
