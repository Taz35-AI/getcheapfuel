'use client';

import { useState } from 'react';
import type { OpeningHours } from '@/lib/types';
import { getOpenStatus, getWeekSchedule } from '@/lib/opening-hours';

interface Props {
  hours: OpeningHours | undefined;
  variant?: 'badge' | 'full';
}

export default function OpenStatusBadge({ hours, variant = 'badge' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = getOpenStatus(hours);
  if (!status) return null;

  const dotColor = status.isOpen ? 'bg-green-500' : 'bg-red-500';
  const textColor = status.isOpen ? 'text-green-700' : 'text-red-700';
  const bgColor = status.isOpen ? 'bg-green-50' : 'bg-red-50';

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${bgColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={`text-[10px] font-semibold ${textColor}`}>{status.isOpen ? 'Open' : 'Closed'}</span>
      </div>
    );
  }

  const week = getWeekSchedule(hours);

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${bgColor} hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className={`font-semibold ${textColor}`}>{status.label}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-gray-50 space-y-1">
          {week.map((d) => (
            <div
              key={d.day}
              className={`flex items-center justify-between ${d.isToday ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
            >
              <span>{d.day}</span>
              <span className="tabular-nums">{d.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
