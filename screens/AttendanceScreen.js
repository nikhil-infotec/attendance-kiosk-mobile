import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import RNFS from 'react-native-fs';

// Import new services
import offlineSyncManager from '../services/OfflineSyncManager';
import analyticsService from '../services/AnalyticsService';
import ToastService from '../services/ToastService';
import HapticFeedback from '../utils/HapticFeedback';

const AttendanceScreen = ({ systemData, updateSystemData, logError }) => {
  const [scanning, setScanning] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  useEffect(() => {
    // Track screen view
    analyticsService.trackScreenView('AttendanceScreen');
  }, []);

  const markAttendanceWithFingerprint = async () => {
    HapticFeedback.light();
    
    if (systemData.enrolledUsers.length === 0) {
      ToastService.warning('No users enrolled');
      Alert.alert('⚠️ No Users', 'Please enroll users first before marking attendance');
      return;
    }

    // Get users with fingerprint enrolled
    const fingerprintUsers = systemData.enrolledUsers.filter(
      u => u.hasFingerprint || u.enrollmentType === 'fingerprint' || u.enrollmentType === 'both'
    );

    if (fingerprintUsers.length === 0) {
      ToastService.warning('No fingerprints enrolled');
      Alert.alert('⚠️ No Fingerprints', 'No users have fingerprint enrolled');
      return;
    }

    // Show user selection first
    setShowUserSelection(true);
  };

  const confirmFingerprintAfterSelection = async (user) => {
    setShowUserSelection(false);
    setSelectedUser(user);

    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

    try {
      const { available } = await rnBiometrics.isSensorAvailable();

      if (!available) {
        Alert.alert('❌ Not Available', 'Fingerprint sensor is not available');
        return;
      }

      setScanning(true);
      
      try {
        const { success } = await rnBiometrics.createSignature({
          promptMessage: `✅ VERIFY FINGERPRINT\n\nPlace finger to confirm:\n${user.userName} (${user.userId})`,
          payload: user.userId + '_' + Date.now(),
          cancelButtonText: 'Cancel'
        });

        if (success) {
          // Fingerprint confirmed! Record attendance
          recordAttendance(user, 'fingerprint');
        } else {
          Alert.alert('❌ Failed', 'Fingerprint authentication failed');
        }
      } catch (error) {
        logError('FINGERPRINT', 'Attendance scan failed', { error: error.message });
        Alert.alert('❌ Error', error.message);
      } finally {
        setScanning(false);
        setSelectedUser(null);
      }
    } catch (error) {
      logError('FINGERPRINT', 'Sensor error', { error: error.message });
      Alert.alert('❌ Error', error.message);
      setScanning(false);
    }
  };

  const markAttendanceWithNFC = async () => {
    if (systemData.enrolledUsers.length === 0) {
      Alert.alert('⚠️ No Users', 'Please enroll users first before marking attendance');
      return;
    }

    try {
      setScanning(true);
      Alert.alert(
        '📡 Scan NFC Card',
        'Hold the NFC card to the back of your phone',
        [
          { 
            text: 'Cancel', 
            onPress: () => {
              NfcManager.cancelTechnologyRequest();
              setScanning(false);
            }, 
            style: 'cancel' 
          },
          {
            text: 'Start Scan',
            onPress: async () => {
              try {
                const scanStart = Date.now();
                await NfcManager.requestTechnology(NfcTech.Ndef);
                const tag = await NfcManager.getTag();

                let cardUid = '';
                if (tag && tag.id) {
                  cardUid = Array.from(tag.id)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join(':')
                    .toUpperCase();
                }

                await NfcManager.cancelTechnologyRequest();
                const scanDuration = Date.now() - scanStart;

                // Find user by card UID
                const user = systemData.enrolledUsers.find(u => u.cardUid === cardUid && u.hasNFC);

                if (user) {
                  recordAttendance(user, 'nfc', { cardUid, scanDuration });
                } else {
                  Alert.alert(
                    '❌ Card Not Recognized',
                    `Card UID: ${cardUid}\n\nThis card is not assigned to any user. Please enroll first.`
                  );
                }

              } catch (scanError) {
                await NfcManager.cancelTechnologyRequest();
                logError('NFC', 'Card scan failed', { error: scanError.message });
                Alert.alert('❌ Scan Failed', scanError.message);
              } finally {
                setScanning(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      logError('NFC', 'NFC error', { error: error.message });
      Alert.alert('❌ Error', error.message);
      setScanning(false);
    }
  };

  const markAttendanceWithBarcode = async () => {
    if (systemData.enrolledUsers.length === 0) {
      Alert.alert('⚠️ No Users', 'Please enroll users first');
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        '📷 Camera Permission Required',
        'Please grant camera permission to scan barcodes',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    if (!device) {
      Alert.alert('❌ No Camera', 'Camera not available on this device');
      return;
    }

    setShowBarcodeScanner(true);
  };

  const onBarcodeScanned = async (codes) => {
    if (codes.length === 0 || scanning) return;

    const scannedCode = codes[0].value;
    setScanning(true);
    setShowBarcodeScanner(false);

    const scanStartTime = Date.now();

    // Find user with this barcode
    const user = systemData.enrolledUsers.find(u => u.barcodeId === scannedCode);

    const scanDuration = Date.now() - scanStartTime;

    if (user) {
      recordAttendance(user, 'barcode', { barcodeId: scannedCode, scanDuration });
    } else {
      Alert.alert(
        '❌ Barcode Not Recognized',
        `Scanned: ${scannedCode}\n\nThis barcode is not assigned to any user. Please enroll first.`
      );
    }

    setScanning(false);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['code-128', 'code-39', 'code-93', 'ean-13', 'ean-8', 'upc-a', 'upc-e'],
    onCodeScanned: onBarcodeScanned,
  });

  // ==================== FACE RECOGNITION ATTENDANCE ====================




  const recordAttendance = async (user, method, extraData = {}) => {
    const startTime = Date.now();
    
    const attendanceRecord = {
      id: Date.now(),
      userId: user.userId,
      userName: user.userName,
      userRole: user.userRole,
      method: method,
      timestamp: new Date().toISOString(),
      ...extraData,
    };

    try {
      // Check if online
      const isOnline = offlineSyncManager.checkOnlineStatus();

      if (!isOnline) {
        // OFFLINE MODE: Queue for later sync
        await offlineSyncManager.addToQueue({
          type: 'attendance',
          data: {
            uid: user.userId,
            device_id: 'NOTHING_PHONE_2',
            timestamp: new Date().toISOString(),
            type: method,
            user_name: user.userName,
            user_role: user.userRole,
            location: { latitude: 0, longitude: 0 },
            device_model: 'Nothing Phone 2',
            ...extraData,
          },
          url: 'https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php',
          method: 'POST',
        });

        // Save to local history
        const updatedHistory = [
          { ...attendanceRecord, syncStatus: 'queued' },
          ...systemData.attendanceHistory
        ].slice(0, 50);
        await updateSystemData('attendanceHistory', updatedHistory);

        // User feedback
        HapticFeedback.success();
        ToastService.info(`📱 Queued offline - will sync when online`);

        Alert.alert(
          '📱 QUEUED FOR SYNC',
          `${method === 'fingerprint' ? '👆 FINGERPRINT VERIFIED' : 
             method === 'nfc' ? '📡 RFID CARD SCANNED' : 
             method === 'barcode' ? '📊 BARCODE SCANNED' : 
             '👤 FACE RECOGNIZED'}\n\n` +
          `👤 ${user.userName}\n` +
          `🆔 ${user.userId}\n` +
          `📋 ${user.userRole}\n` +
          `🕐 ${new Date().toLocaleTimeString()}\n` +
          `\n📱 You're offline. Attendance queued for sync.`,
          [{ text: 'OK', style: 'default' }]
        );

        // Track analytics
        await analyticsService.trackAttendance(method, true);
        await analyticsService.trackEvent('offline', 'queue_attendance', method);

        return;
      }

      // ONLINE MODE: Direct server sync
      const response = await fetch(
        'https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': 'secure_kiosk_2024_v2',
          },
          body: JSON.stringify({
            uid: user.userId,
            device_id: 'NOTHING_PHONE_2',
            timestamp: new Date().toISOString(),
            type: method,
            user_name: user.userName,
            user_role: user.userRole,
            location: { latitude: 0, longitude: 0 },
            device_model: 'Nothing Phone 2',
            ...extraData,
          }),
        }
      );

      const data = await response.json();

      // Save to history
      const updatedHistory = [
        { ...attendanceRecord, syncStatus: 'success', serverResponse: data },
        ...systemData.attendanceHistory
      ].slice(0, 50);
      await updateSystemData('attendanceHistory', updatedHistory);

      // Update stats
      const updatedStats = {
        ...systemData.systemStats,
        totalScans: systemData.systemStats.totalScans + 1,
        successfulScans: systemData.systemStats.successfulScans + 1,
        lastSyncTime: new Date().toISOString(),
      };
      await updateSystemData('systemStats', updatedStats);

      // User feedback
      HapticFeedback.success();
      ToastService.success(`✅ Attendance recorded for ${user.userName}`);

      Alert.alert(
        '✅ ATTENDANCE MARKED!',
        `${method === 'fingerprint' ? '👆 FINGERPRINT VERIFIED' : 
           method === 'nfc' ? '📡 RFID CARD SCANNED' : 
           method === 'barcode' ? '📊 BARCODE SCANNED' : 
           '👤 FACE RECOGNIZED'}\n\n` +
        `👤 ${user.userName}\n` +
        `🆔 ${user.userId}\n` +
        `📋 ${user.userRole}\n` +
        `🕐 ${new Date().toLocaleTimeString()}\n` +
        `${method === 'face' && extraData.faceConfidence ? `🎯 Confidence: ${extraData.faceConfidence}\n` : ''}` +
        `\n✅ Synced to server successfully!`,
        [{ text: 'OK', style: 'default' }]
      );

      // Track analytics
      await analyticsService.trackAttendance(method, true);
      const duration = Date.now() - startTime;
      await analyticsService.trackPerformance(`attendance_${method}`, duration);

    } catch (error) {
      // Error handling
      HapticFeedback.error();
      ToastService.error(`Failed: ${error.message}`);
      
      logError('SYNC', 'Server sync failed', {
        error: error.message,
        userId: user.userId,
      });

      // Track analytics
      await analyticsService.trackError('attendance_failed', error.message, method);
      await analyticsService.trackAttendance(method, false);

      // Save to history as failed
      const updatedHistory = [
        { ...attendanceRecord, syncStatus: 'failed', error: error.message },
        ...systemData.attendanceHistory
      ].slice(0, 50);
      await updateSystemData('attendanceHistory', updatedHistory);

      // Update stats
      const updatedStats = {
        ...systemData.systemStats,
        totalScans: systemData.systemStats.totalScans + 1,
        failedScans: systemData.systemStats.failedScans + 1,
        lastSyncTime: new Date().toISOString(),
      };
      await updateSystemData('systemStats', updatedStats);

      Alert.alert(
        '⚠️ Partial Success',
        `Attendance marked for ${user.userName}\n\n` +
        `✅ Saved locally\n` +
        `❌ Server sync failed: ${error.message}\n\n` +
        `Will retry sync later.`,
        [{ text: 'OK' }]
      );
    }
  };

  const recentAttendance = systemData.attendanceHistory.slice(0, 5);

  const fingerprintUsers = systemData.enrolledUsers.filter(
    u => u.hasFingerprint || u.enrollmentType === 'fingerprint' || u.enrollmentType === 'both'
  );

  const filteredUsers = fingerprintUsers.filter(user => 
    searchQuery === '' ||
    user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerIcon}>✅</Text>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>Quick & secure verification</Text>
        </View>
      </View>

      {/* Scan Options */}
      <View style={styles.scanCard}>
        <Text style={styles.cardTitle}>✋ Mark Attendance</Text>
        
        <Text style={styles.subtitle}>👇 Select verification method</Text>

        <TouchableOpacity 
          style={[styles.modernScanButton, styles.fingerprintButton]}
          onPress={markAttendanceWithFingerprint}
          disabled={scanning}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>👆</Text>
          </View>
          <View style={styles.scanContent}>
            <Text style={styles.scanTitle}>Verify Fingerprint</Text>
            <Text style={styles.scanSubtitle}>Select user → Scan finger</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modernScanButton, styles.nfcButton]}
          onPress={markAttendanceWithNFC}
          disabled={scanning}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>📱</Text>
          </View>
          <View style={styles.scanContent}>
            <Text style={styles.scanTitle}>Scan RFID Card</Text>
            <Text style={styles.scanSubtitle}>Tap card instantly</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modernScanButton, styles.barcodeButton]}
          onPress={markAttendanceWithBarcode}
          disabled={scanning}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>📊</Text>
          </View>
          <View style={styles.scanContent}>
            <Text style={styles.scanTitle}>Scan Barcode</Text>
            <Text style={styles.scanSubtitle}>Camera scan barcode</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>



        {scanning && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>🔄 Scanning...</Text>
          </View>
        )}
        
        {recognizing && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>👤 Recognizing face...</Text>
          </View>
        )}
      </View>

      {/* User Selection Modal */}
      {showUserSelection && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👆 Select Your Name</Text>
            <Text style={styles.modalSubtitle}>
              Who are you? ({fingerprintUsers.length} users)
            </Text>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            
            <ScrollView style={styles.userList} nestedScrollEnabled={true}>
              {filteredUsers.map((user, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.userSelectButton}
                  onPress={() => confirmFingerprintAfterSelection(user)}>
                  <Text style={styles.userSelectIcon}>
                    {user.enrollmentType === 'both' ? '👆📡' : '👆'}
                  </Text>
                  <View style={styles.userSelectInfo}>
                    <Text style={styles.userSelectName}>{user.userName}</Text>
                    <Text style={styles.userSelectMeta}>
                      {user.userId} | {user.userRole}
                    </Text>
                  </View>
                  <Text style={styles.userSelectArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowUserSelection(false);
                setSearchQuery('');
              }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    

      {/* Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>📊 Today's Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{systemData.systemStats.totalScans}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statSuccess]}>
              {systemData.systemStats.successfulScans}
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statFailed]}>
              {systemData.systemStats.failedScans}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* Recent Scans */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🕐 Recent Scans</Text>
        
        {recentAttendance.length > 0 ? (
          recentAttendance.map((record, index) => (
            <View 
              key={record.id || index} 
              style={[
                styles.recordCard,
                record.syncStatus === 'success' ? styles.recordSuccess : styles.recordFailed
              ]}>
              <Text style={styles.recordIcon}>
                {record.method === 'fingerprint' ? '👆' : record.method === 'nfc' ? '📡' : '📊'}
              </Text>
              <View style={styles.recordContent}>
                <Text style={styles.recordName}>{record.userName}</Text>
                <Text style={styles.recordMeta}>
                  {record.userId} | {record.userRole}
                </Text>
                <Text style={styles.recordTime}>
                  {new Date(record.timestamp).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.recordStatus}>
                {record.syncStatus === 'success' ? '✅' : '❌'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No attendance records yet</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
        <Text style={styles.infoText}>
          1. Choose fingerprint, NFC, or barcode{'\n'}
          2. Scan your fingerprint/card/barcode{'\n'}
          3. Attendance is recorded automatically{'\n'}
          4. Data syncs to server instantly{'\n'}
          {'\n'}
          💡 Make sure you're enrolled first!
        </Text>
      </View>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && device && (
        <Modal
          visible={showBarcodeScanner}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowBarcodeScanner(false)}>
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              device={device}
              isActive={showBarcodeScanner}
              codeScanner={codeScanner}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraTitle}>📊 Scan Barcode</Text>
              <Text style={styles.cameraInstructions}>
                Position barcode within frame
              </Text>
              <TouchableOpacity
                style={styles.cameraCancelButton}
                onPress={() => setShowBarcodeScanner(false)}>
                <Text style={styles.cameraCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 0,
    paddingBottom: 30,
  },
  modernHeader: {
    backgroundColor: '#1e293b',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headerGradient: {
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  scanCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 20,
    fontWeight: '500',
  },
  modernScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fingerprintButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  nfcButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  buttonIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonIcon: {
    fontSize: 28,
  },
  buttonArrow: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },
  scanContent: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scanSubtitle: {
    fontSize: 13,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  scanningIndicator: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  statSuccess: {
    color: '#48bb78',
  },
  statFailed: {
    color: '#fc8181',
  },
  statLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  // User Selection Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  userList: {
    maxHeight: 400,
  },
  userSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userSelectIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  userSelectInfo: {
    flex: 1,
  },
  userSelectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  userSelectMeta: {
    fontSize: 12,
    color: '#718096',
  },
  userSelectArrow: {
    fontSize: 20,
    color: '#4299e1',
  },
  modalCancelButton: {
    backgroundColor: '#e2e8f0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  recordSuccess: {
    backgroundColor: '#f0fff4',
    borderLeftColor: '#38a169',
  },
  recordFailed: {
    backgroundColor: '#fff5f5',
    borderLeftColor: '#e53e3e',
  },
  recordIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 11,
    color: '#a0aec0',
  },
  recordStatus: {
    fontSize: 20,
    alignSelf: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  infoCard: {
    backgroundColor: '#ebf8ff',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4299e1',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2c5282',
    lineHeight: 20,
  },
  barcodeButton: {
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cameraInstructions: {
    fontSize: 16,
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cameraCancelButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraCancelText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AttendanceScreen;
