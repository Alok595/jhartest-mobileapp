import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Keep native splash screen held until React Native layout mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

const brandLogo = require('../../assets/images/newlogo2.jpeg');

// High-resilience Error Boundary to prevent any hard Android OS crashes
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Uncaught Crash Intercepted:', error, errorInfo);
    SplashScreen.hideAsync().catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App encountered an issue</Text>
          <Text style={styles.errorSubtitle}>
            {this.state.error?.message || 'A temporary error occurred while starting up.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [isSplashDone, setIsSplashDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.4)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const glowScaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(24)).current;
  const sloganFadeAnim = useRef(new Animated.Value(0)).current;
  const sloganScaleAnim = useRef(new Animated.Value(0.85)).current;
  const sloganTranslateAnim = useRef(new Animated.Value(18)).current;
  const lineExpandAnim = useRef(new Animated.Value(0)).current;

  const finishSplash = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(splashScaleAnim, {
        toValue: 1.06,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSplashDone(true);
    });
  };

  useEffect(() => {
    // Hide native splash screen so custom branding renders immediately
    SplashScreen.hideAsync().catch(() => {});

    // Premium entrance animation sequence with staggered parallel timings
    Animated.parallel([
      // 1. Logo spring reveal with subtle spin & glow pulse
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 55,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(glowScaleAnim, {
        toValue: 1.3,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      // 2. Brand Name "jhartest" slides up smoothly at 200ms
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(textFadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.spring(textTranslateAnim, {
            toValue: 0,
            tension: 65,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(lineExpandAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ]),

      // 3. Slogan "prep smarter • score higher" appears boldly at 400ms
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(sloganFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(sloganScaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(sloganTranslateAnim, {
            toValue: 0,
            tension: 60,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Smooth transition to main app after extended brand showcase (3.2s)
    const timer = setTimeout(() => {
      finishSplash();
    }, 3200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const logoSpin = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: '#0B1120' }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="(auth)/login"
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Student Login',
                headerBackTitle: 'Cancel',
              }}
            />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>

          {/* High-Performance Crash-Proof Splash Screen */}
          {!isSplashDone && (
            <Animated.View
              style={[
                styles.splashContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: splashScaleAnim }],
                },
              ]}
            >
              <StatusBar style="light" />

              {/* Ambient Glow Backdrop */}
              <Animated.View
                style={[
                  styles.ambientGlow,
                  {
                    transform: [{ scale: glowScaleAnim }],
                  },
                ]}
              />

              <View style={styles.brandWrapper}>
                {/* Logo with Spring + Spin Entrance */}
                <Animated.View
                  style={[
                    styles.logoCard,
                    {
                      transform: [{ scale: logoScaleAnim }, { rotate: logoSpin }],
                    },
                  ]}
                >
                  <Image
                    source={brandLogo}
                    style={styles.logoImage}
                    contentFit="contain"
                    transition={200}
                  />
                </Animated.View>

                {/* Animated Brand Name: jhartest */}
                <Animated.View
                  style={{
                    opacity: textFadeAnim,
                    transform: [{ translateY: textTranslateAnim }],
                    alignItems: 'center',
                    marginTop: 20,
                  }}
                >
                  <Text style={styles.brandName}>
                    jhar<Text style={styles.brandNameHighlight}>test</Text>
                  </Text>
                </Animated.View>

                {/* Animated Gradient Accent Divider */}
                <Animated.View
                  style={[
                    styles.accentLine,
                    {
                      width: lineExpandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 140],
                      }),
                    },
                  ]}
                />

                {/* Animated Slogan: Prep Smarter • Score Higher */}
                <Animated.View
                  style={{
                    opacity: sloganFadeAnim,
                    transform: [
                      { translateY: sloganTranslateAnim },
                      { scale: sloganScaleAnim },
                    ],
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <Text style={styles.brandSlogan}>
                    Prep Smarter <Text style={styles.sloganDot}>•</Text> Score Higher
                  </Text>
                </Animated.View>
              </View>
            </Animated.View>
          )}
        </View>
        <StatusBar style="auto" />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F87171',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 114, 255, 0.15)',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  brandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  brandNameHighlight: {
    color: '#38BDF8',
  },
  accentLine: {
    height: 2.5,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 2,
  },
  brandSlogan: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  sloganDot: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
  },
});
