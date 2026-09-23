import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Keep native splash screen held until React Native layout mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

const brandLogo = require('../../assets/images/icon.png');

export default function RootLayout() {
  const [isSplashDone, setIsSplashDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.85)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(10)).current;

  const finishSplash = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsSplashDone(true);
    });
  };

  useEffect(() => {
    // Hide native splash screen so custom branding renders immediately
    SplashScreen.hideAsync().catch(() => {});

    // Premium entrance animation for Brand Logo & Slogan
    Animated.parallel([
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Smooth transition to main app after short brand showcase (1.5s)
    const timer = setTimeout(() => {
      finishSplash();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
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
          <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
            <StatusBar style="light" />
            
            <Animated.View
              style={[
                styles.brandWrapper,
                {
                  transform: [{ scale: logoScaleAnim }],
                },
              ]}
            >
              <Image
                source={brandLogo}
                style={styles.logoImage}
                contentFit="contain"
                transition={200}
              />
              
              <Animated.View
                style={{
                  opacity: textFadeAnim,
                  transform: [{ translateY: textTranslateAnim }],
                  alignItems: 'center',
                  marginTop: 16,
                }}
              >
                <Text style={styles.brandName}>
                  jhar<Text style={styles.brandNameHighlight}>test</Text>
                </Text>
                <Text style={styles.brandSlogan}>prep smarter • score higher</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 24,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  brandNameHighlight: {
    color: '#4ADE80',
  },
  brandSlogan: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
});
