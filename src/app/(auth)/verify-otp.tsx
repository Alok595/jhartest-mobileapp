import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getApiBaseUrl } from '../../services/api';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Required', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        // Navigate to reset password screen with email and otp
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email, otp: otp.trim() }
        });
      } else {
        Alert.alert('Error', data.error || 'Invalid OTP');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Network error. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0072FF', '#0099FF', '#00C853']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerNavRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify OTP</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.formTitle}>Enter OTP</Text>
          <Text style={styles.formSubtitle}>
            We have sent a 6-digit OTP to {email}. Please enter it below to verify your identity.
          </Text>

          <View style={styles.inputContainer}>
            <KeyRound size={20} color="#0072FF" style={styles.inputIcon} />
            <TextInput
              placeholder="6-Digit OTP"
              placeholderTextColor="#94A3B8"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
          </View>

          <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} style={{ marginTop: 20 }}>
            <LinearGradient colors={['#0072FF', '#00C853']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Verify OTP</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', paddingBottom: 20 },
  headerSafeArea: { paddingHorizontal: 20 },
  headerNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10 },
  formSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.2, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', height: '100%', letterSpacing: 2 },
  submitBtn: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
