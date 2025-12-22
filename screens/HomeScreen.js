import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import NfcManager from 'react-native-nfc-manager';

const HomeScreen = ({ systemData, updateSystemData, logError, navigateTo }) => {
  const [deviceStatus, setDeviceStatus] = useState({
    internet: 'Checking...',
    nfc: 'Checking...',
    gps: 'Checking...',
    fingerprint: 'Checking...',
  });

  useEffect(() => {
    checkDeviceStatus();
  }, []);

  const checkDeviceStatus = async () => {
    // Internet Check
    let internetStatus = '❌ Offline';
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      internetStatus = response.ok ? '✅ Online' : '⚠️ Limited';
    } catch (err) {
      internetStatus = '❌ Offline';
      logError('NETWORK', 'No internet connection', { error: err.message });
    }

    // NFC Check
    let nfcStatus = '❌ Not Available';
    try {
      const nfcSupported = await NfcManager.isSupported();
      if (nfcSupported) {
        const nfcEnabled = await NfcManager.isEnabled();
        nfcStatus = nfcEnabled ? '✅ Ready' : '⚠️ Enable NFC';
      }
    } catch (err) {
      nfcStatus = '❌ Error';
      logError('NFC', 'NFC check failed', { error: err.message });
    }

    // GPS Check
    let gpsStatus = '❌ Not Available';
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        gpsStatus = granted ? '✅ Granted' : '⚠️ Need Permission';
      } catch (err) {
        gpsStatus = '❌ Error';
        logError('GPS', 'GPS check failed', { error: err.message });
      }
    }

    setDeviceStatus({
      internet: internetStatus,
      nfc: nfcStatus,
      gps: gpsStatus,
      fingerprint: Platform.OS === 'android' ? '✅ Available' : '❌ Not Available',
    });
  };

  const testServer = async () => {
    try {
      const response = await fetch(
        'https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': 'kiosk_main_gate_2024',
          },
          body: JSON.stringify({
            uid: 'TEST_CONNECTION',
            device_id: 'NOTHING_PHONE_2',
            timestamp: new Date().toISOString(),
            type: 'test',
          }),
        }
      );
      
      const data = await response.json();
      Alert.alert('✅ Server Connected!', JSON.stringify(data, null, 2));
    } catch (error) {
      logError('SERVER', 'Server test failed', { error: error.message });
      Alert.alert('❌ Connection Failed', error.message);
    }
  };

  const { enrolledUsers, systemStats } = systemData;
  const successRate = systemStats.totalScans > 0 
    ? ((systemStats.successfulScans / systemStats.totalScans) * 100).toFixed(1)
    : 0;

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerEmoji}>🏠</Text>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Complete System Diagnostics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
      
      {/* Quick Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>📊 Quick Stats</Text>
        <Text style={styles.statsTitle}>📊 Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{enrolledUsers.length}</Text>
            <Text style={styles.statLabel}>Enrolled Users</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{systemStats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValueSuccess}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Device Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 Device Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Internet:</Text>
          <Text style={styles.statusValue}>{deviceStatus.internet}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>NFC Reader:</Text>
          <Text style={styles.statusValue}>{deviceStatus.nfc}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Fingerprint:</Text>
          <Text style={styles.statusValue}>{deviceStatus.fingerprint}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>GPS:</Text>
          <Text style={styles.statusValue}>{deviceStatus.gps}</Text>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={checkDeviceStatus}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateTo('enroll')}>
          <Text style={styles.actionIcon}>➕</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Enroll New User</Text>
            <Text style={styles.actionSubtitle}>Assign fingerprint or NFC card</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateTo('attendance')}>
          <Text style={styles.actionIcon}>✋</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mark Attendance</Text>
            <Text style={styles.actionSubtitle}>Scan fingerprint or NFC card</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigateTo('history')}>
          <Text style={styles.actionIcon}>📜</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View History</Text>
            <Text style={styles.actionSubtitle}>Check attendance records</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={testServer}>
          <Text style={styles.actionIcon}>🌐</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Test Server</Text>
            <Text style={styles.actionSubtitle}>Check connection to Hostinger</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Server Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🌐 Server Configuration</Text>
        <Text style={styles.serverUrl}>
          darkviolet-dotterel-146840.hostingersite.com
        </Text>
        <Text style={styles.infoText}>Status: {deviceStatus.internet}</Text>
      </View>

    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernHeader: {
    backgroundColor: '#1e293b',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    opacity: 0.9,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  statsCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  statValueSuccess: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#48bb78',
  },
  statLabel: {
    fontSize: 11,
    color: 'white',
    marginTop: 4,
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#718096',
  },
  infoCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#78350f',
    marginBottom: 8,
  },
  serverUrl: {
    fontSize: 12,
    color: '#92400e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#92400e',
  },
});

export default HomeScreen;
