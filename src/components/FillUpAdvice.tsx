'use client';

import { useState, useEffect } from 'react';

interface Trend {
  direction: 'rising' | 'falling' | 'stable';
  diff: number;
  currentAvg: number;
  days: number;
  fuelType: string;
}

const ADVICE = {
  rising: {
    label: 'Fill up now',
    sublabel: 'Prices are rising',
    icon: '↑',
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-600',
    text: 'text-red-700',
    subtext: 'text-red-500',
  },
  falling: {
    label: 'Wait if you can',
    sublabel: 'Prices are dropping',
    icon: '↓',
    bg: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100 text-green-600',
    text: 'text-green-700',
    subtext: 'text-green-500',
  },
  stable: {
    label: 'Prices are steady',
    sublabel: 'No big changes expected',
    icon: '→',
    bg: 'bg-gray-50 border-gray-200',
    iconBg: 'bg-gray-100 text-gray-600',
    text: 'text-gray-700',
    subtext: 'text-gray-500',
  },
};

interface FillUpAdviceProps {
  fuelType: string;
}

export default function FillUpAdvice({ fuelType }: FillUpAdviceProps) {
  const [trend, setTrend] = useState<Trend | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    fetch(`/api/price-trend?fuelType=${fuelType}`)
      .then(res => res.json())
      .then(data => setTrend(data.trend || null))
      .catch(() => setTrend(null));
  }, [fuelType]);

  if (!trend || dismissed) return null;

  const a = ADVICE[trend.direction];
  const diffText = trend.diff > 0
    ? `+${trend.diff}p avg over ${trend.days} days`
    : trend.diff < 0
    ? `${trend.diff}p avg over ${trend.days} days`
    : `Steady over ${trend.days} days`;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${a.bg} transition-all`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${a.iconBg}`}>
        {a.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${a.text}`}>{a.label}</div>
        <div className={`text-[11px] ${a.subtext}`}>
          {a.sublabel} &middot; {diffText}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`text-sm font-bold ${a.text}`}>{trend.currentAvg.toFixed(1)}p</div>
        <div className="text-[10px] text-gray-400">UK avg</div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
