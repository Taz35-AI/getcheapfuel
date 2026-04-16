'use client';

import { useState, useEffect } from 'react';
import { isNative } from '@/lib/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Already installed as a native app - don't show install prompt
  if (isNative()) return null;

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('gcf_install_dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem('gcf_install_dismissed', '1');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-2 md:right-4 z-[1001] bg-white rounded-xl shadow-2xl border border-gray-200 p-3 max-w-[260px] animate-slide-up">
      <div className="flex items-start gap-2">
        <img src="/icons/icon-48.png" alt="GetCheapFuel" className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">Install App</div>
          <div className="text-xs text-gray-500 mt-0.5">Add GetCheapFuel to your home screen for quick access</div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
