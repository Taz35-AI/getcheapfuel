'use client';

import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  text: string;
  lat: number;
  lng: number;
}

export default function ShareButton({ title, text, lat, lng }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  const shareData = { title, text: `${text}\n${url}`, url };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
      title="Share"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
