'use client';

import { useState, useEffect, useCallback } from 'react';
import { isNative } from '@/lib/platform';
import { apiUrl } from '@/lib/api';
import { PushNotifications } from '@capacitor/push-notifications';

interface NotificationManagerProps {
  open: boolean;
  onClose: () => void;
}

interface PriceAlert {
  id: string;
  fuelType: string;
  threshold: number;
  enabled: boolean;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function NotificationManager({ open, onClose }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newFuel, setNewFuel] = useState('E10');
  const [newThreshold, setNewThreshold] = useState(140);
  const [saving, setSaving] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Load alerts from localStorage as draft state
    try {
      const stored = localStorage.getItem('gcf_price_alerts');
      if (stored) setAlerts(JSON.parse(stored));
    } catch {}

    if (isNative()) {
      // Native: check Capacitor push permission
      PushNotifications.checkPermissions().then(({ receive }) => {
        setPermission(receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default');
      });
      // Check if native token was previously sent
      const hasToken = localStorage.getItem('gcf_native_push_token');
      setSubscribed(!!hasToken);
    } else {
      // Web: check browser notification permission
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            setSubscribed(!!sub);
          });
        });
      }
    }
  }, []);

  const persistAlerts = (next: PriceAlert[]) => {
    setAlerts(next);
    localStorage.setItem('gcf_price_alerts', JSON.stringify(next));
  };

  const requestPermission = async () => {
    if (isNative()) {
      const { receive } = await PushNotifications.requestPermissions();
      setPermission(receive === 'granted' ? 'granted' : 'denied');
    } else {
      if (typeof Notification === 'undefined') return;
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  const subscribeToPush = useCallback(async () => {
    if (permission !== 'granted') {
      setStatusMsg('Please enable notifications first');
      return;
    }
    if (alerts.filter(a => a.enabled).length === 0) {
      setStatusMsg('Add at least one alert first');
      return;
    }

    setSaving(true);
    setStatusMsg('');

    try {
      if (isNative()) {
        // Native: register with FCM/APNs via Capacitor
        await PushNotifications.register();

        // Listen for token (fires once after register)
        const tokenPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Token timeout')), 10000);
          PushNotifications.addListener('registration', ({ value }) => {
            clearTimeout(timeout);
            resolve(value);
          });
          PushNotifications.addListener('registrationError', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        const token = await tokenPromise;
        localStorage.setItem('gcf_native_push_token', token);

        // Send native token + alerts to our API
        const res = await fetch(apiUrl('/api/push/native-subscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            platform: (await import('@capacitor/core')).Capacitor.getPlatform(),
            alerts: alerts
              .filter(a => a.enabled)
              .map(a => ({ fuelType: a.fuelType, threshold: a.threshold })),
          }),
        });

        if (res.ok) {
          setSubscribed(true);
          setStatusMsg('Alerts saved! You\'ll get notified when prices drop.');
        } else {
          const data = await res.json();
          setStatusMsg(data.error || 'Failed to save alerts');
        }
      } else {
        // Web: use service worker push
        const reg = await navigator.serviceWorker.ready;

        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          });
        }

        const res = await fetch(apiUrl('/api/push/subscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            alerts: alerts
              .filter(a => a.enabled)
              .map(a => ({ fuelType: a.fuelType, threshold: a.threshold })),
          }),
        });

        if (res.ok) {
          setSubscribed(true);
          setStatusMsg('Alerts saved! You\'ll get notified when prices drop.');
        } else {
          const data = await res.json();
          setStatusMsg(data.error || 'Failed to save alerts');
        }
      }
    } catch (err) {
      console.error('Push subscribe error:', err);
      setStatusMsg('Failed to set up notifications. Try again.');
    } finally {
      setSaving(false);
    }
  }, [permission, alerts]);

  const unsubscribe = async () => {
    setSaving(true);
    try {
      if (isNative()) {
        const token = localStorage.getItem('gcf_native_push_token');
        if (token) {
          await fetch(apiUrl('/api/push/unsubscribe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `native:${token}` }),
          });
          localStorage.removeItem('gcf_native_push_token');
        }
      } else {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await fetch(apiUrl('/api/push/unsubscribe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
      }
      setSubscribed(false);
      setStatusMsg('Unsubscribed from notifications');
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addAlert = () => {
    const alert: PriceAlert = {
      id: Date.now().toString(),
      fuelType: newFuel,
      threshold: newThreshold,
      enabled: true,
    };
    persistAlerts([...alerts, alert]);
  };

  const removeAlert = (id: string) => {
    persistAlerts(alerts.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    persistAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  if (!open) return null;

  const fuelOptions = [
    { value: 'E10', label: 'Unleaded (E10)' },
    { value: 'E5', label: 'Premium (E5)' },
    { value: 'B7', label: 'Diesel (B7)' },
    { value: 'SDV', label: 'Super Diesel' },
  ];

  const enabledCount = alerts.filter(a => a.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Price Alerts</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
          {/* Permission section */}
          {permission !== 'granted' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="text-sm font-medium text-amber-800">
                {permission === 'denied'
                  ? 'Notifications are blocked. Please enable them in your browser settings.'
                  : 'Enable notifications to receive price alerts'}
              </div>
              {permission === 'default' && (
                <button
                  onClick={requestPermission}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          )}

          {permission === 'granted' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-green-700">
                {subscribed ? 'Alerts active' : 'Notifications enabled'}
              </div>
              {subscribed && (
                <button
                  onClick={unsubscribe}
                  disabled={saving}
                  className="text-xs text-red-500 underline hover:text-red-700"
                >
                  Unsubscribe
                </button>
              )}
            </div>
          )}

          {/* Add alert */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Add Alert</div>
            <div className="flex gap-2">
              <select
                value={newFuel}
                onChange={e => setNewFuel(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white text-gray-700 flex-1"
              >
                {fuelOptions.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">below</span>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={e => setNewThreshold(Number(e.target.value))}
                  className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-2 text-center"
                  min={80}
                  max={250}
                />
                <span className="text-xs text-gray-500">p</span>
              </div>
              <button
                onClick={addAlert}
                className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Alert list */}
          {alerts.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Alerts</div>
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className={`w-8 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                      alert.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        alert.enabled ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {fuelOptions.find(f => f.value === alert.fuelType)?.label}
                    </div>
                    <div className="text-xs text-gray-500">Below {alert.threshold}p</div>
                  </div>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 py-4">
              No alerts set. Add one above to get notified when prices drop.
            </div>
          )}

          {/* Save / Sync button */}
          {alerts.length > 0 && permission === 'granted' && (
            <button
              onClick={subscribeToPush}
              disabled={saving || enabledCount === 0}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              )}
              {subscribed ? `Update Alerts (${enabledCount})` : `Activate Alerts (${enabledCount})`}
            </button>
          )}

          {statusMsg && (
            <div className={`mt-3 text-center text-xs font-medium ${
              statusMsg.includes('Failed') || statusMsg.includes('Please') || statusMsg.includes('Add at')
                ? 'text-red-500'
                : 'text-green-600'
            }`}>
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
