import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        // If code or access_token is in params
        if (params.code && typeof params.code === 'string') {
          await supabase.auth.exchangeCodeForSession(params.code);
        } else if (params.access_token && typeof params.access_token === 'string') {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: (params.refresh_token as string) || '',
          });
        }

        // Wait a small tick to ensure profile & session are propagated
        await refreshProfile().catch(() => {});
      } catch (err) {
        console.warn('Auth callback handling error:', err);
      } finally {
        if (isMounted) {
          router.replace('/(tabs)');
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0072FF" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0072FF',
  },
});
