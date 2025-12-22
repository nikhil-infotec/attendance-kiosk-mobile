import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';

const HistoryScreen = ({ systemData, updateSystemData }) => {
  const clearHistory = () => {
    Alert.alert(
      '⚠️ Confirm Clear',
      'Are you sure you want to clear all attendance history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await updateSystemData('attendanceHistory', []);
            Alert.alert('✅ Cleared', 'Attendance history has been cleared');
          }
        }
      ]
    );
  };

  const { attendanceHistory } = systemData;

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerEmoji}>📜</Text>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <Text style={styles.headerSubtitle}>
          Total Records: {attendanceHistory.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

      {/* Clear Button */}
      {attendanceHistory.length > 0 && (
        <View>
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>🗑️ Clear All History</Text>
          </TouchableOpacity>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Records:</Text>
              <Text style={styles.summaryValue}>{attendanceHistory.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Successful Syncs:</Text>
              <Text style={[styles.summaryValue, styles.textSuccess]}>
                {attendanceHistory.filter(r => r.syncStatus === 'success').length}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Failed Syncs:</Text>
              <Text style={[styles.summaryValue, styles.textFailed]}>
                {attendanceHistory.filter(r => r.syncStatus !== 'success').length}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fingerprint:</Text>
              <Text style={styles.summaryValue}>
                {attendanceHistory.filter(r => r.method === 'fingerprint').length} 👆
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>NFC Card:</Text>
              <Text style={styles.summaryValue}>
                {attendanceHistory.filter(r => r.method === 'nfc').length} 📡
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Barcode:</Text>
              <Text style={styles.summaryValue}>
                {attendanceHistory.filter(r => r.method === 'barcode').length} 📊
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Face:</Text>
              <Text style={styles.summaryValue}>
                {attendanceHistory.filter(r => r.method === 'face').length} 👤
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* History List */}
      <View style={styles.card}>
        {attendanceHistory.length > 0 ? (
          attendanceHistory.map((record, index) => (
            <View 
              key={record.id || index} 
              style={[
                styles.recordCard,
                record.syncStatus === 'success' ? styles.recordSuccess : styles.recordFailed
              ]}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordIcon}>
                  {record.method === 'fingerprint' ? '👆' : 
                   record.method === 'nfc' ? '📡' : 
                   record.method === 'barcode' ? '📊' : 
                   '👤'}
                </Text>
                <View style={styles.recordHeaderContent}>
                  <Text style={styles.recordName}>{record.userName}</Text>
                  <Text style={styles.recordId}>ID: {record.userId}</Text>
                </View>
                <Text style={styles.recordStatus}>
                  {record.syncStatus === 'success' ? '✅' : '❌'}
                </Text>
              </View>
              
              <View style={styles.recordDetails}>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Role:</Text>
                  <Text style={styles.recordValue}>{record.userRole}</Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Method:</Text>
                  <Text style={styles.recordValue}>
                    {record.method === 'fingerprint' ? 'Fingerprint' : 
                     record.method === 'nfc' ? 'NFC Card' : 
                     record.method === 'barcode' ? 'Barcode' : 
                     'Face Recognition'}
                  </Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Time:</Text>
                  <Text style={styles.recordValue}>
                    {new Date(record.timestamp).toLocaleString()}
                  </Text>
                </View>
                {record.cardUid && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Card UID:</Text>
                    <Text style={styles.recordValueSmall}>{record.cardUid}</Text>
                  </View>
                )}
                {record.barcodeId && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Barcode ID:</Text>
                    <Text style={styles.recordValueSmall}>{record.barcodeId}</Text>
                  </View>
                )}
                {record.faceConfidence && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Face Confidence:</Text>
                    <Text style={styles.recordValue}>{record.faceConfidence} 🎯</Text>
                  </View>
                )}
                {record.livenessScore && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Liveness Score:</Text>
                    <Text style={styles.recordValue}>{record.livenessScore}/100 🔒</Text>
                  </View>
                )}
                {record.fingerprintPublicKey && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Biometric Key:</Text>
                    <Text style={styles.recordValueSmall}>
                      {record.fingerprintPublicKey.substring(0, 30)}...
                    </Text>
                  </View>
                )}
                {record.scanDuration && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Scan Duration:</Text>
                    <Text style={styles.recordValue}>{record.scanDuration}ms</Text>
                  </View>
                )}
                {record.deviceModel && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Device:</Text>
                    <Text style={styles.recordValue}>{record.deviceModel}</Text>
                  </View>
                )}
                {record.location && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Location:</Text>
                    <Text style={styles.recordValueSmall}>
                      {record.location.latitude?.toFixed(6)}, {record.location.longitude?.toFixed(6)}
                    </Text>
                  </View>
                )}
                {record.networkLatency && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Network Latency:</Text>
                    <Text style={styles.recordValue}>{record.networkLatency}ms</Text>
                  </View>
                )}
                {record.serverResponse && (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Server Response:</Text>
                    <Text style={styles.recordValue}>
                      {record.serverResponse.status || 'Success'}
                    </Text>
                  </View>
                )}
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Sync Status:</Text>
                  <Text style={[
                    styles.recordValue,
                    record.syncStatus === 'success' ? styles.textSuccess : styles.textFailed
                  ]}>
                    {record.syncStatus === 'success' ? 'Synced' : 'Failed'}
                  </Text>
                </View>
                {record.error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>Error: {record.error}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No attendance records yet</Text>
            <Text style={styles.emptySubtext}>
              Start marking attendance to see history here
            </Text>
          </View>
        )}
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
  clearButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  recordCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  recordSuccess: {
    backgroundColor: '#f0fff4',
    borderLeftColor: '#38a169',
  },
  recordFailed: {
    backgroundColor: '#fff5f5',
    borderLeftColor: '#e53e3e',
  },
  recordHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  recordIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  recordHeaderContent: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  recordId: {
    fontSize: 12,
    color: '#718096',
  },
  recordStatus: {
    fontSize: 24,
  },
  recordDetails: {
    paddingLeft: 8,
  },
  recordRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  recordLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
    width: 100,
  },
  recordValue: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
    flex: 1,
  },
  recordValueSmall: {
    fontSize: 11,
    color: '#2d3748',
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textSuccess: {
    color: '#38a169',
  },
  textFailed: {
    color: '#e53e3e',
  },
  errorBox: {
    backgroundColor: '#fed7d7',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#c53030',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#a0aec0',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '700',
  },
});

export default HistoryScreen;
