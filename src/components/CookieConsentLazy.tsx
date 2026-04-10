'use client';

import dynamic from 'next/dynamic';

// Client-side dynamic wrapper so the server layout can include this
// without violating the App Router rule about ssr:false in server components.
const CookieConsent = dynamic(() => import('./CookieConsent'), { ssr: false });

export default function CookieConsentLazy() {
  return <CookieConsent />;
}
