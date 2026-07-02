export default {
  expo: {
    name: 'StriRide Captain',
    slug: 'striride-captain',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'striride-captain',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E91E8C',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'com.striride.captain',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#E91E8C',
          android: {
            image: './assets/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      'expo-secure-store',
      'expo-location',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '0bd32729-f341-419b-a0cb-e87b176e2aa9',
      },
    },
  },
};
