import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AuthProvider } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Keep native splash screen held until React Native layout mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

const videoSource = require('../../assets/images/splashscrren2.mp4');

export default function RootLayout() {
  const [isSplashVideoDone, setIsSplashVideoDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Initialize expo-video player directly
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.play();
  });

  const finishSplash = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsSplashVideoDone(true);
    });
  };

  useEffect(() => {
    // Hide native splash screen so custom video splash renders immediately
    SplashScreen.hideAsync().catch(() => {});

    // Listen for video completion
    let subscription: any = null;
    if (player) {
      subscription = player.addListener('playToEnd', () => {
        finishSplash();
      });
    }

    // Smooth entrance animation for App Name & Slogan
    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(textScaleAnim, {
        toValue: 1,
        duration: 700,
        delay: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Fallback timer to unmount splash screen cleanly after video duration
    const timer = setTimeout(() => {
      finishSplash();
    }, 2800);

    return () => {
      if (subscription) subscription.remove();
      clearTimeout(timer);
    };
  }, [player]);

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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

        {/* Custom Fullscreen Video Splash Screen */}
        {!isSplashVideoDone && (
          <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
            <StatusBar style="light" hidden={false} />
            
            <VideoView
              style={styles.splashVideo}
              player={player}
              nativeControls={false}
              contentFit="cover"
            />

            {/* Subtle Contrast Gradient / Overlay */}
            <View style={styles.overlayGradient} />

            {/* Brand Title & Slogan Overlay */}
            <Animated.View
              style={[
                styles.brandWrapper,
                {
                  opacity: textFadeAnim,
                  transform: [{ scale: textScaleAnim }],
                },
              ]}
            >
              <Text style={styles.brandName}>
                jhar<Text style={styles.brandNameHighlight}>test</Text>
              </Text>
              <Text style={styles.brandSlogan}>prep smarter, score higher</Text>
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  brandWrapper: {
    position: 'absolute',
    bottom: height * 0.12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  brandName: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0072FF',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  brandNameHighlight: {
    color: '#00C853',
  },
  brandSlogan: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'lowercase',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
