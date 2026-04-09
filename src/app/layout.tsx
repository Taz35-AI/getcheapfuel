import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes and find the best deals. Real data from 7,500+ stations.",
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
    "fuel cost calculator",
    "fuel route planner UK",
    "compare petrol station prices",
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
      "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes and find the best deals. Real data from 7,500+ stations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetCheapFuel - Cheap Petrol, Diesel & EV Charging Prices UK",
    description:
      "Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes and find the best deals. Real data from 7,500+ stations.",
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
    <html lang="en-GB" className={`${geistSans.variable} h-full`}>
      <body className="h-full font-sans">
        {children}
        <Analytics />
        <CookieConsent />
        <noscript>
          <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h1>GetCheapFuel - Compare Cheap Petrol, Diesel &amp; EV Charging Prices UK</h1>
            <p>Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes and find the best deals. Real data from 7,500+ fuel stations.</p>
            <h2>Features</h2>
            <ul>
              <li>Real-time petrol and diesel prices from 13 major UK retailers</li>
              <li>EV charging station locations and connector types</li>
              <li>Fuel cost calculator</li>
              <li>Route planner to find cheap fuel on your journey</li>
              <li>Compare prices across stations side by side</li>
              <li>Price alerts and favourites</li>
            </ul>
            <p>Please enable JavaScript to use GetCheapFuel.</p>
            <p>Contact: <a href="mailto:support@getcheapfuel.co.uk">support@getcheapfuel.co.uk</a></p>
          </div>
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
