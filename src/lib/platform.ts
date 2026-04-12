import { Capacitor } from '@capacitor/core';

/** True when running inside a native iOS/Android shell (not a browser). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** True when running inside the iOS app. */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** True when running inside the Android app. */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** True when running in a regular browser (desktop or mobile). */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}
