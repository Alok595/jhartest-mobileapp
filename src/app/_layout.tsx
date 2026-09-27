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

  // Staggered Entrance Animations
  const logoScaleAnim = useRef(new Animated.Value(0.3)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const pulseRingScale = useRef(new Animated.Value(0.8)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0)).current;

  const titleTranslateY = useRef(new Animated.Value(35)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const lineScaleX = useRef(new Animated.Value(0)).current;

  const sloganTranslateY = useRef(new Animated.Value(25)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;

  const footerOpacity = useRef(new Animated.Value(0)).current;

  const finishSplash = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(splashScaleAnim, {
        toValue: 1.08,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSplashDone(true);
    });
  };

  useEffect(() => {
    // Hide native expo splash screen
    SplashScreen.hideAsync().catch(() => {});

    // Continuous floating logo loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous ambient glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseRingScale, {
            toValue: 1.3,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(pulseRingOpacity, {
              toValue: 0.6,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRingOpacity, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(pulseRingScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Orchestrated Staggered Entrance
    Animated.stagger(200, [
      // 1. Logo Springs into View
      Animated.parallel([
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 2. Brand Title Slides Up
      Animated.parallel([
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 3. Accent Line Expands Outward
      Animated.spring(lineScaleX, {
        toValue: 1,
        tension: 80,
        friction: 7,
        useNativeDriver: true,
      }),

      // 4. Slogan "Prep Smarter Score Higher" Fades and Slides in
      Animated.parallel([
        Animated.spring(sloganTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(sloganOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 5. Bottom Footer Tagline
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Transition to main app
    const timer = setTimeout(() => {
      finishSplash();
    }, 3400);

    return () => {
      clearTimeout(timer);
    };
  }, []);

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

          {/* High-Performance Amazing Animated Splash Screen */}
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
              <StatusBar style="dark" />

              {/* Ambient Pulsing Glow Rings */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseRingScale }],
                    opacity: pulseRingOpacity,
                  },
                ]}
              />

              <View style={styles.brandCenterWrapper}>
                {/* 1. App Icon with Spring & Float */}
                <Animated.View
                  style={[
                    styles.logoCard,
                    {
                      opacity: logoOpacityAnim,
                      transform: [
                        { scale: logoScaleAnim },
                        { translateY: floatAnim },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/app-icon.png')}
                    style={styles.appIconImage}
                    contentFit="cover"
                  />
                </Animated.View>

                {/* 2. Brand Name: JharTest */}
                <Animated.View
                  style={[
                    styles.titleContainer,
                    {
                      opacity: titleOpacity,
                      transform: [{ translateY: titleTranslateY }],
                    },
                  ]}
                >
                  <Text style={styles.brandTitleText}>
                    <Text style={styles.brandTitleDark}>Jhar</Text>
                    <Text style={styles.brandTitleBlue}>Test</Text>
                  </Text>
                </Animated.View>

                {/* 3. Animated Expanding Accent Line */}
                <Animated.View
                  style={[
                    styles.accentLine,
                    {
                      transform: [{ scaleX: lineScaleX }],
                    },
                  ]}
                />

                {/* 4. Slogan: Prep Smarter Score Higher */}
                <Animated.View
                  style={[
                    styles.sloganContainer,
                    {
                      opacity: sloganOpacity,
                      transform: [{ translateY: sloganTranslateY }],
                    },
                  ]}
                >
                  <Text style={styles.sloganText}>Prep Smarter, Score Higher</Text>
                </Animated.View>
              </View>

              {/* 5. Bottom Watermark & Tagline */}
              <Animated.View
                style={[
                  styles.bottomContainer,
                  {
                    opacity: footerOpacity,
                  },
                ]}
              >
                <View style={styles.dotContainer}>
                  <View style={[styles.pulseDot, { backgroundColor: '#0072FF' }]} />
                  <View style={[styles.pulseDot, { backgroundColor: '#00C853', marginHorizontal: 6 }]} />
                  <View style={[styles.pulseDot, { backgroundColor: '#FF9100' }]} />
                </View>
                <Text style={styles.footerTagline}>
                  Jharkhand's Premier Test Series Platform
                </Text>
              </Animated.View>
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 114, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 114, 255, 0.25)',
  },
  brandCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    marginBottom: 20,
  },
  appIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitleText: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTitleDark: {
    color: '#071F3D',
  },
  brandTitleBlue: {
    color: '#0072FF',
  },
  accentLine: {
    width: 70,
    height: 4,
    backgroundColor: '#0072FF',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 14,
  },
  sloganContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sloganText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
});
