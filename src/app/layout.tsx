import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://getcheapfuel.co.uk"),
  title: {
    default: "GetCheapFuel - Cheap Petrol, Diesel & EV Charging Prices UK",
    template: "%s | GetCheapFuel",
  },
  description:
    "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Real data from 7,500+ stations.",
  keywords: [
    "cheap petrol UK",
    "cheap diesel UK",
    "fuel prices near me",
    "petrol prices today",
    "diesel prices today",
    "EV charging near me",
    "EV charging prices UK",
    "cheapest fuel station",
    "fuel price comparison",
    "petrol station finder",
    "UK fuel prices",
    "save money on fuel",
  ],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://getcheapfuel.co.uk",
    siteName: "GetCheapFuel",
    title: "GetCheapFuel - Cheap Petrol, Diesel & EV Charging Prices UK",
    description:
      "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Real data from 7,500+ stations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetCheapFuel - Cheap Petrol, Diesel & EV Charging Prices UK",
    description:
      "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Real data from 7,500+ stations.",
  },
  alternates: {
    canonical: "https://getcheapfuel.co.uk",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GetCheapFuel",
  },
  other: {
    "geo.region": "GB",
    "geo.placename": "United Kingdom",
    "contact": "support@getcheapfuel.co.uk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="h-full font-sans">
        {children}
        <CookieConsent />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
