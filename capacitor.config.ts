import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.getcheapfuel.app',
  appName: 'GetCheapFuel',
  webDir: 'out',

  // Load the live website — always up-to-date, no app store update needed
  server: {
    url: 'https://getcheapfuel.co.uk',
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
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
    backgroundColor: '#ffffff',
    allowMixedContent: false,
  },
};

export default config;
