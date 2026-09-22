import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return (
      <SafeAreaView style={styles.container}>
        <ShieldAlert size={48} color="#EF4444" style={{ alignSelf: 'center', marginTop: 40 }} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorSub}>You do not have permission to view this page.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Control Center</Text>
      </View>
      
      {/* Placeholder for future admin stats and controls */}
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardText}>👥 Manage Users</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardText}>📝 Manage Tests & Exams</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardText}>💰 Financial Reports</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  headerBack: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 20 },
  errorSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10 },
  backBtn: {
    backgroundColor: '#0072FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 30,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold' }
});
