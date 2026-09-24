import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Settings,
  LogOut,
  LogIn,
  Award,
  Clock,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Package,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, stats, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of JharTest?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color="#0072FF" />
          </View>
          
          {user ? (
            <>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.phone}>{user.phone || user.email}</Text>
              <View style={styles.roleBadge}>
                <ShieldCheck size={12} color="#0072FF" />
                <Text style={styles.roleText}>
                  {user.role === 'ADMIN' ? 'Administrator' : 'Premium Aspirant'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>Guest Aspirant</Text>
              <Text style={styles.phone}>Sign in to save test scores & rank analytics</Text>
              <TouchableOpacity
                style={styles.loginBtn}
                activeOpacity={0.88}
                onPress={() => router.push('/(auth)/login')}
              >
                <LogIn size={15} color="#FFFFFF" />
                <Text style={styles.loginBtnText}>Sign In / Register</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.testsAttempted ?? (user ? 0 : 0)}</Text>
            <Text style={styles.statLabel}>Tests Taken</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={[styles.statValue, { color: '#0072FF' }]}>
              {stats?.accuracy ?? (user ? '0%' : '--')}
            </Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EA580C' }]}>
              {stats?.stateRank ?? (user ? 'Rank --' : '--')}
            </Text>
            <Text style={styles.statLabel}>State Rank</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              if (!user) router.push('/(auth)/login');
              else router.push('/profile/attempts');
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Award size={18} color="#0072FF" />
            </View>
            <Text style={styles.menuTitle}>Attempt History & Analytics</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              if (!user) router.push('/(auth)/login');
              else router.push('/(tabs)/purchases');
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Package size={18} color="#0072FF" />
            </View>
            <Text style={styles.menuTitle}>My Purchases & Batches</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://wa.me/917903466871?text=Hello%20JharTest%2C%20I%20need%20help%20regarding%20my%20test%20series')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <HelpCircle size={18} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Student Helpline (WhatsApp)</Text>
              <Text style={styles.menuSubTitle}>+91 79034 66871</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#F8FAFC' }]}>
              <Settings size={18} color="#64748B" />
            </View>
            <Text style={styles.menuTitle}>App Settings</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') ? (
            <TouchableOpacity
              style={[styles.menuItem, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(admin)/dashboard')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#0072FF' }]}>
                <ShieldCheck size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.menuTitle, { color: '#0072FF', fontWeight: '800' }]}>
                Admin Dashboard
              </Text>
              <ChevronRight size={18} color="#0072FF" />
            </TouchableOpacity>
          ) : null}

          {user ? (
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text style={[styles.menuTitle, { color: '#EF4444' }]}>Log Out</Text>
              <ChevronRight size={18} color="#EF4444" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Developer Attribution */}
        <View style={styles.developerSection}>
          <Text style={styles.developerLabel}>designed & developed by</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://genzdevworks.ratnahomes.in')}
            style={styles.developerBadge}
          >
            <Image
              source={require('../../../assets/images/genzdev-logo.png')}
              style={styles.developerLogo}
              resizeMode="contain"
            />
            <Text style={styles.developerText}>
              GenZDev <Text style={styles.developerTextAccent}>Works</Text>
            </Text>
            <View style={styles.developerDot} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  phone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0072FF',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0072FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutItem: {
    marginTop: 10,
    borderColor: '#FEE2E2',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 1,
  },
  developerSection: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  developerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'lowercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  developerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  developerLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  developerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  developerTextAccent: {
    color: '#F97316',
    fontWeight: '800',
  },
  developerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
});
