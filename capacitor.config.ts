import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.getcheapfuel.app',
  appName: 'GetCheapFuel',
  webDir: 'out',

  // Load the live website — always up-to-date, no app store update needed
  server: {
    url: 'https://getcheapfuel.co.uk',
    cleartext: false,
    // Allow navigation to external URLs (Google Maps, Waze links etc.)
    allowNavigation: ['getcheapfuel.co.uk', '*.getcheapfuel.co.uk'],
  },

  plugins: {
    SplashScreen: {
      // Keep splash visible until the web page signals it's ready
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#16a34a',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'GetCheapFuel',
  },

  android: {
    backgroundColor: '#16a34a',
    allowMixedContent: false,
    // Use Chrome WebView for better compatibility
    webContentsDebuggingEnabled: false,
  },
};

export default config;
