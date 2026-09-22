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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Mail, User, Eye, EyeOff, CheckSquare, Square, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Official Google G Icon SVG
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, registerUser } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isValidEmail = (text: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (!password) {
      Alert.alert('Required', 'Please enter your password');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', res.error || 'Invalid credentials or connection error.');
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      Alert.alert('Required', 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Required', 'Please enter a password of at least 6 characters');
      return;
    }

    setLoading(true);
    const res = await registerUser({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Registration Failed', res.error || 'Could not register. Please try again.');
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Google Sign-In Error', res.error || 'Google authentication failed');
    }
  };

  return (
    <View style={styles.container}>
      {/* Curved Header matching App Logo Palette (Blue to Green) */}
      <LinearGradient
        colors={['#0072FF', '#0099FF', '#00C853']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerNavRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>

            {/* Brand Logo in Header */}
            <View style={styles.brandTitleContainer}>
              <Text style={styles.brandText}>
                jhar<Text style={styles.brandTextHighlight}>test</Text>
              </Text>
            </View>

            <View style={{ width: 40 }} />
          </View>
          
          <Text style={styles.headerSubHeading}>prep smarter, score higher</Text>

          {/* Segmented Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={styles.tab} 
              onPress={() => setMode('LOGIN')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'LOGIN' && styles.activeTabText]}>
                Sign In
              </Text>
              {mode === 'LOGIN' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tab} 
              onPress={() => setMode('REGISTER')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'REGISTER' && styles.activeTabText]}>
                Sign Up
              </Text>
              {mode === 'REGISTER' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Scrollable Form Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {mode === 'LOGIN' ? 'Welcome Back!' : 'Create Your Account'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'LOGIN' 
                ? 'Sign in to access your Jharkhand test series & study materials' 
                : 'Join thousands of students preparing for JPSC & JSSC exams'}
            </Text>

            <View style={styles.inputsWrapper}>
              {mode === 'REGISTER' && (
                <View style={styles.inputContainer}>
                  <User size={20} color="#0072FF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#0072FF" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#0072FF" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                </TouchableOpacity>
              </View>

              {mode === 'LOGIN' && (
                <View style={styles.optionsRow}>
                  <TouchableOpacity style={styles.rememberBtn} onPress={() => setRemember(!remember)}>
                    {remember ? <CheckSquare size={16} color="#0072FF" /> : <Square size={16} color="#94A3B8" />}
                    <Text style={styles.rememberText}>Remember Password</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text style={styles.forgetText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Button with Logo Gradient */}
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={mode === 'LOGIN' ? handleLogin : handleRegister}
                disabled={loading || googleLoading}
              >
                <LinearGradient
                  colors={['#0072FF', '#00C853']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  Or {mode === 'LOGIN' ? 'sign in' : 'sign up'} with
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity 
                  style={styles.googleBtn} 
                  activeOpacity={0.8}
                  onPress={handleGoogleAuth}
                  disabled={loading || googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="#0072FF" />
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerWrapper: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  headerSafeArea: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
  },
  brandTitleContainer: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandTextHighlight: {
    color: '#A7F3D0', // Mint green highlight matching logo
  },
  headerSubHeading: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    paddingBottom: 14,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  inputsWrapper: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: -2,
  },
  rememberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  forgetText: {
    fontSize: 13,
    color: '#0072FF',
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#64748B',
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    paddingBottom: 20,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
});


