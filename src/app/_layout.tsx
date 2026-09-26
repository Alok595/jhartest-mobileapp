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

  // Granular Animations
  const logoScaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const textTranslateAnim = useRef(new Animated.Value(30)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const lineScaleAnim = useRef(new Animated.Value(0)).current;
  
  const sloganTranslateAnim = useRef(new Animated.Value(20)).current;
  const sloganOpacityAnim = useRef(new Animated.Value(0)).current;

  const finishSplash = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(splashScaleAnim, {
        toValue: 1.05,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSplashDone(true);
    });
  };

  useEffect(() => {
    // Hide native splash screen
    SplashScreen.hideAsync().catch(() => {});

    // Stunning Staggered Sequence (100% Native Driver)
    Animated.stagger(250, [
      // 1. Logo scales up and fades in
      Animated.parallel([
        Animated.spring(logoScaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // 2. Title slides up and fades in
      Animated.parallel([
        Animated.spring(textTranslateAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(textOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // 3. Green line expands outward (scaleX)
      Animated.spring(lineScaleAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      // 4. Slogan slides up and fades in
      Animated.parallel([
        Animated.spring(sloganTranslateAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(sloganOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Transition to main app
    const timer = setTimeout(() => {
      finishSplash();
    }, 3800);

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
              <StatusBar style="dark" />

              <View style={styles.brandWrapper}>
                {/* 1. Logo */}
                <Animated.View
                  style={[
                    styles.logoCard,
                    {
                      opacity: logoOpacityAnim,
                      transform: [{ scale: logoScaleAnim }],
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/newlogo2.jpeg')}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </Animated.View>

                {/* 2. Text */}
                <Animated.View
                  style={{
                    opacity: textOpacityAnim,
                    transform: [{ translateY: textTranslateAnim }],
                    marginTop: 12,
                  }}
                >
                  <Image
                    source={require('../../assets/images/title.png')}
                    style={styles.titleImage}
                    contentFit="contain"
                  />
                </Animated.View>

                {/* 3. Divider Line (scaleX for native driver) */}
                <Animated.View
                  style={[
                    styles.accentLine,
                    {
                      transform: [{ scaleX: lineScaleAnim }],
                    },
                  ]}
                />

                {/* 4. Slogan */}
                <Animated.View
                  style={{
                    opacity: sloganOpacityAnim,
                    transform: [{ translateY: sloganTranslateAnim }],
                  }}
                >
                  <Image
                    source={require('../../assets/images/slogan.png')}
                    style={styles.sloganImage}
                    contentFit="contain"
                  />
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 200, 83, 0.05)',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  brandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
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
  titleImage: {
    width: 220,
    height: 48,
  },
  accentLine: {
    width: 110,
    height: 3,
    backgroundColor: '#00C853',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  sloganImage: {
    width: 180,
    height: 18,
  },
});
