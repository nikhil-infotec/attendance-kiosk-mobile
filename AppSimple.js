import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// Pre-defined users (you can expand this)
const USERS_DATABASE = [
  { id: '1001234567', name: 'John Doe', role: 'Student', grade: '10-A' },
  { id: '1001234568', name: 'Jane Smith', role: 'Student', grade: '10-B' },
  { id: '1001234569', name: 'Mike Johnson', role: 'Teacher', department: 'Mathematics' },
];

function App() {
  const [deviceInfo, setDeviceInfo] = useState({
    platform: Platform.OS,
    version: Platform.Version,
    fingerprint: 'Checking...',
    usbHost: 'Checking...',
    gps: 'Checking...',
    internet: 'Checking...',
  });
  
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [errorLogs, setErrorLogs] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    lastSyncTime: null,
  });
  const [advancedInfo, setAdvancedInfo] = useState({
    screenSize: `${Dimensions.get('window').width}x${Dimensions.get('window').height}`,
    deviceModel: Platform.OS === 'android' ? 'Nothing Phone 2' : 'iOS Device',
    appVersion: '2.0.0',
    buildNumber: '20251219',
  });

  useEffect(() => {
    checkDeviceCapabilities();
    loadEnrolledUsers();
    initNFC();
    loadErrorLogs();
    loadAttendanceHistory();
    loadSystemStats();
  }, []);

  // Error Logging System
  const logError = async (errorType, errorMessage, errorDetails = {}) => {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: errorType,
      message: errorMessage,
      details: errorDetails,
      platform: Platform.OS,
      version: Platform.Version,
    };
    
    const newErrorLogs = [errorEntry, ...errorLogs].slice(0, 100); // Keep last 100 errors
    setErrorLogs(newErrorLogs);
    
    try {
      await AsyncStorage.setItem('errorLogs', JSON.stringify(newErrorLogs));
      console.error(`[${errorType}] ${errorMessage}`, errorDetails);
    } catch (err) {
      console.error('Failed to save error log:', err);
    }
  };

  const loadErrorLogs = async () => {
    try {
      const logs = await AsyncStorage.getItem('errorLogs');
      if (logs) {
        setErrorLogs(JSON.parse(logs));
      }
    } catch (error) {
      console.log('Error loading error logs:', error);
    }
  };

  const clearErrorLogs = async () => {
    try {
      await AsyncStorage.removeItem('errorLogs');
      setErrorLogs([]);
      Alert.alert('✅ Success', 'Error logs cleared successfully');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to clear error logs');
    }
  };

  // Attendance History System
  const loadAttendanceHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('attendanceHistory');
      if (history) {
        setAttendanceHistory(JSON.parse(history));
      }
    } catch (error) {
      logError('STORAGE', 'Failed to load attendance history', { error: error.message });
    }
  };

  const saveAttendanceRecord = async (record) => {
    try {
      const newHistory = [record, ...attendanceHistory].slice(0, 50); // Keep last 50 records
      setAttendanceHistory(newHistory);
      await AsyncStorage.setItem('attendanceHistory', JSON.stringify(newHistory));
    } catch (error) {
      logError('STORAGE', 'Failed to save attendance record', { error: error.message });
    }
  };

  // System Statistics
  const loadSystemStats = async () => {
    try {
      const stats = await AsyncStorage.getItem('systemStats');
      if (stats) {
        setSystemStats(JSON.parse(stats));
      }
    } catch (error) {
      logError('STORAGE', 'Failed to load system stats', { error: error.message });
    }
  };

  const updateSystemStats = async (success) => {
    try {
      const newStats = {
        ...systemStats,
        totalScans: systemStats.totalScans + 1,
        successfulScans: success ? systemStats.successfulScans + 1 : systemStats.successfulScans,
        failedScans: success ? systemStats.failedScans : systemStats.failedScans + 1,
        lastSyncTime: new Date().toISOString(),
      };
      setSystemStats(newStats);
      await AsyncStorage.setItem('systemStats', JSON.stringify(newStats));
    } catch (error) {
      logError('STORAGE', 'Failed to update system stats', { error: error.message });
    }
  };

  const initNFC = async () => {
    try {
      const supported = await NfcManager.isSupported();
      if (supported) {
        await NfcManager.start();
        console.log('NFC initialized successfully');
      } else {
        logError('NFC', 'NFC not supported on this device', { supported: false });
      }
    } catch (error) {
      logError('NFC', 'NFC initialization failed', { error: error.message, stack: error.stack });
    }
  };

  const loadEnrolledUsers = async () => {
    try {
      const enrolled = await AsyncStorage.getItem('enrolledUsers');
      if (enrolled) {
        setEnrolledUsers(JSON.parse(enrolled));
      }
    } catch (error) {
      logError('STORAGE', 'Failed to load enrolled users', { error: error.message });
    }
  };

  const saveEnrolledUser = async (userId, publicKey) => {
    try {
      const user = USERS_DATABASE.find(u => u.id === userId);
      if (!user) {
        Alert.alert('Error', 'User not found in database');
        return;
      }

      const newEnrolled = [...enrolledUsers, { userId, publicKey, ...user }];
      await AsyncStorage.setItem('enrolledUsers', JSON.stringify(newEnrolled));
      setEnrolledUsers(newEnrolled);
      
      Alert.alert(
        '✅ Enrollment Successful!',
        `${user.name} has been enrolled successfully.\n\nThey can now use fingerprint for attendance.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save enrollment: ' + error.message);
    }
  };

  const checkDeviceCapabilities = async () => {
    const startTime = Date.now();
    
    // Check GPS with detailed error logging
    let gpsStatus = '❌ Not Available';
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted) {
          gpsStatus = '✅ Permission Granted';
        } else {
          gpsStatus = '⚠️ Permission Required';
          logError('GPS', 'GPS permission not granted', { granted: false });
        }
      } catch (err) {
        gpsStatus = '❌ Error checking GPS';
        logError('GPS', 'Failed to check GPS permission', { error: err.message });
      }
    } else {
      gpsStatus = '⚠️ iOS - Check Settings';
    }

    // Check Internet with detailed capture
    let internetStatus = '❌ Offline';
    let networkLatency = 'N/A';
    try {
      const fetchStart = Date.now();
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
      });
      const fetchEnd = Date.now();
      networkLatency = `${fetchEnd - fetchStart}ms`;
      
      if (response.ok) {
        internetStatus = `✅ Connected (${networkLatency})`;
      } else {
        internetStatus = '⚠️ Limited';
        logError('NETWORK', 'Limited internet connectivity', { status: response.status });
      }
    } catch (err) {
      internetStatus = '❌ No Connection';
      logError('NETWORK', 'No internet connection', { error: err.message });
    }

    // Check NFC with detailed logging
    let nfcStatus = '❌ Not Available';
    try {
      const nfcSupported = await NfcManager.isSupported();
      if (nfcSupported) {
        const nfcEnabled = await NfcManager.isEnabled();
        nfcStatus = nfcEnabled ? '✅ NFC Ready' : '⚠️ Enable in Settings';
        
        if (!nfcEnabled) {
          logError('NFC', 'NFC disabled in settings', { supported: true, enabled: false });
        }
      } else {
        logError('NFC', 'NFC not supported', { supported: false });
      }
    } catch (err) {
      nfcStatus = '❌ NFC Not Supported';
      logError('NFC', 'NFC check failed', { error: err.message });
    }

    const checkDuration = Date.now() - startTime;

    setDeviceInfo({
      platform: Platform.OS === 'android' ? '✅ Android' : Platform.OS,
      version: `API ${Platform.Version}`,
      fingerprint: Platform.OS === 'android' ? '✅ In-Display Scanner' : '❌ Not Supported',
      usbHost: Platform.OS === 'android' ? '✅ USB OTG Capable' : '❌ Not Supported',
      nfc: nfcStatus,
      gps: gpsStatus,
      internet: internetStatus,
      networkLatency: networkLatency,
      lastCheck: new Date().toLocaleTimeString(),
      checkDuration: `${checkDuration}ms`,
    });
  };

  const testServerConnection = () => {
    fetch('https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': 'kiosk_main_gate_2024',
      },
      body: JSON.stringify({
        uid: 'TEST123',
        device_id: 'EMULATOR_TEST',
        timestamp: new Date().toISOString(),
      }),
    })
      .then(response => response.json())
      .then(data => {
        alert('✅ SERVER CONNECTED!\n\n' + JSON.stringify(data, null, 2));
      })
      .catch(error => {
        alert('❌ CONNECTION FAILED!\n\n' + error.message);
      });
  };

  const requestGPSPermission = async () => {
    if (Platform.OS !== 'android') {
      alert('GPS permissions are managed in iOS Settings');
      return;
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'GPS Permission',
          message: 'This app needs GPS access for attendance geofencing',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        alert('✅ GPS Permission Granted!');
        checkDeviceCapabilities();
      } else {
        alert('❌ GPS Permission Denied');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const enrollFingerprint = async () => {
    if (!selectedUserId) {
      Alert.alert('⚠️ Select User', 'Please select a user ID to enroll their fingerprint.');
      return;
    }

    const user = USERS_DATABASE.find(u => u.id === selectedUserId);
    if (!user) {
      Alert.alert('Error', 'Invalid user ID');
      return;
    }

    // Check if already enrolled
    const alreadyEnrolled = enrolledUsers.find(u => u.userId === selectedUserId);
    if (alreadyEnrolled) {
      Alert.alert('ℹ️ Already Enrolled', `${user.name} is already enrolled. They can use fingerprint authentication.`);
      return;
    }

    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

    rnBiometrics.isSensorAvailable()
      .then((resultObject) => {
        const { available } = resultObject;

        if (available) {
          Alert.alert(
            '📝 Enroll Fingerprint',
            `Enroll fingerprint for:\n\n${user.name}\nID: ${user.id}\n\nReady to scan?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Scan Fingerprint',
                onPress: () => {
                  rnBiometrics.createKeys()
                    .then((resultObject) => {
                      const { publicKey } = resultObject;
                      
                      rnBiometrics.createSignature({
                        promptMessage: `Enroll fingerprint for ${user.name}`,
                        payload: selectedUserId,
                      })
                        .then((resultObject) => {
                          const { success } = resultObject;
                          
                          if (success) {
                            saveEnrolledUser(selectedUserId, publicKey);
                            setSelectedUserId(''); // Clear selection
                          } else {
                            Alert.alert('❌ Enrollment Failed', 'Fingerprint scan was not successful. Try again.');
                          }
                        })
                        .catch(() => {
                          Alert.alert('Error', 'Failed to create fingerprint signature');
                        });
                    })
                    .catch(() => {
                      Alert.alert('Error', 'Failed to create biometric keys');
                    });
                }
              }
            ]
          );
        } else {
          Alert.alert('❌ Not Available', 'Biometric authentication is not available on this device.');
        }
      });
  };

  const readFingerprint = async () => {
    if (enrolledUsers.length === 0) {
      Alert.alert(
        '⚠️ No Enrolled Users',
        'Please enroll at least one user first before taking attendance.',
        [{ text: 'OK' }]
      );
      return;
    }

    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

    rnBiometrics.isSensorAvailable()
      .then((resultObject) => {
        const { available, biometryType } = resultObject;

        if (available && (biometryType === ReactNativeBiometrics.Biometrics || biometryType === ReactNativeBiometrics.TouchID || biometryType === ReactNativeBiometrics.FaceID)) {
          Alert.alert(
            '🏫 Mark Attendance',
            'Authenticate with your fingerprint to record attendance.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Authenticate',
                onPress: () => {
                  rnBiometrics.createSignature({
                    promptMessage: 'Authenticate to mark attendance',
                    payload: 'attendance_' + Date.now(),
                    cancelButtonText: 'Cancel'
                  })
                    .then((resultObject) => {
                      const { success, signature } = resultObject;

                      if (success) {
                        // Find matching user (in real scenario, you'd verify signature)
                        // For demo, we'll use the first enrolled user or prompt selection
                        if (enrolledUsers.length === 1) {
                          const user = enrolledUsers[0];
                          markAttendance(user);
                        } else {
                          // Multiple users - show selection
                          Alert.alert(
                            '✅ Authenticated!',
                            'Select your name:',
                            enrolledUsers.map(user => ({
                              text: `${user.name} (${user.id})`,
                              onPress: () => markAttendance(user)
                            })).concat([{ text: 'Cancel', style: 'cancel' }])
                          );
                        }
                      } else {
                        Alert.alert('❌ Authentication Failed', 'Fingerprint not recognized. Try again.');
                      }
                    })
                    .catch(() => {
                      Alert.alert('❌ Cancelled', 'Authentication was cancelled.');
                    });
                }
              }
            ]
          );
        } else {
          Alert.alert('❌ Not Available', 'Biometric authentication is not available.');
        }
      });
  };

  const markAttendance = async (user) => {
    const attendanceRecord = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date().toISOString(),
      type: 'fingerprint',
      deviceModel: advancedInfo.deviceModel,
      platform: Platform.OS,
      appVersion: advancedInfo.appVersion,
      networkStatus: deviceInfo.internet,
    };

    Alert.alert(
      '✅ Authenticated Successfully!',
      `Recording attendance for:\n\n${user.name}\nID: ${user.id}\nRole: ${user.role}\n\nTimestamp: ${new Date().toLocaleString()}`,
      [{ text: 'OK' }]
    );

    // Send to server with detailed capture
    try {
      const response = await fetch('https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': 'kiosk_main_gate_2024',
          'X-App-Version': advancedInfo.appVersion,
          'X-Device-Model': advancedInfo.deviceModel,
        },
        body: JSON.stringify({
          uid: user.id,
          device_id: 'FINGERPRINT_KIOSK',
          timestamp: new Date().toISOString(),
          type: 'fingerprint',
          user_name: user.name,
          user_role: user.role,
          location: { latitude: 0, longitude: 0 },
          device_details: {
            model: advancedInfo.deviceModel,
            platform: Platform.OS,
            version: Platform.Version,
            appVersion: advancedInfo.appVersion,
            screenSize: advancedInfo.screenSize,
          },
          network_info: {
            status: deviceInfo.internet,
            latency: deviceInfo.networkLatency,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success || response.ok) {
        await saveAttendanceRecord({ ...attendanceRecord, syncStatus: 'success', serverResponse: data });
        await updateSystemStats(true);
        
        setTimeout(() => {
          Alert.alert(
            '✅ Attendance Recorded!',
            `${user.name}'s attendance has been successfully recorded.\n\nID: ${user.id}\nTime: ${new Date().toLocaleTimeString()}\nServer: Synced`,
            [{ text: 'Done' }]
          );
        }, 500);
      } else {
        throw new Error(data.message || 'Server returned error');
      }
    } catch (error) {
      await logError('SYNC', 'Failed to sync attendance to server', {
        error: error.message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      await saveAttendanceRecord({ ...attendanceRecord, syncStatus: 'failed', error: error.message });
      await updateSystemStats(false);
      
      Alert.alert(
        '⚠️ Server Error',
        `Authentication successful but failed to sync.\n\nError: ${error.message}\n\nRecord saved locally.`,
        [{ text: 'OK' }]
      );
    }
  };

  const readRFIDTag = async () => {
    try {
      Alert.alert(
        '📡 NFC Reader Ready',
        'Hold your RFID/NFC card near the back of your Nothing Phone 2 to scan.',
        [
          { text: 'Cancel', onPress: () => NfcManager.cancelTechnologyRequest(), style: 'cancel' },
          { 
            text: 'Start Scanning', 
            onPress: async () => {
              const scanStartTime = Date.now();
              try {
                // Register for NFC events
                await NfcManager.requestTechnology(NfcTech.Ndef);
                
                // Get tag information
                const tag = await NfcManager.getTag();
                const scanDuration = Date.now() - scanStartTime;
                
                let uid = '';
                if (tag && tag.id) {
                  // Convert tag ID to readable format
                  uid = Array.from(tag.id)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join(':')
                    .toUpperCase();
                }
                
                // Try to read NDEF data if available
                let ndefData = '';
                if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                  const ndefRecord = tag.ndefMessage[0];
                  if (ndefRecord.payload) {
                    ndefData = Ndef.text.decodePayload(ndefRecord.payload);
                  }
                }
                
                // Cancel NFC session
                await NfcManager.cancelTechnologyRequest();
                
                const nfcRecord = {
                  id: Date.now(),
                  uid: uid,
                  tagType: tag.techTypes ? tag.techTypes.join(', ') : 'Unknown',
                  ndefData: ndefData,
                  timestamp: new Date().toISOString(),
                  scanDuration: `${scanDuration}ms`,
                  deviceModel: advancedInfo.deviceModel,
                };
                
                // Show scanned data
                Alert.alert(
                  '✅ NFC Tag Scanned!',
                  `UID: ${uid}\n` +
                  `Type: ${tag.techTypes ? tag.techTypes.join(', ') : 'Unknown'}\n` +
                  `Data: ${ndefData || 'No NDEF data'}\n` +
                  `Scan Time: ${scanDuration}ms\n\n` +
                  'Recording attendance...',
                  [{ text: 'OK' }]
                );
                
                // Send to server with detailed capture
                const response = await fetch('https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Token': 'kiosk_main_gate_2024',
                    'X-App-Version': advancedInfo.appVersion,
                    'X-Device-Model': advancedInfo.deviceModel,
                  },
                  body: JSON.stringify({
                    uid: uid || tag.id,
                    device_id: 'NOTHING_PHONE_2_NFC',
                    timestamp: new Date().toISOString(),
                    type: 'nfc',
                    tag_type: tag.techTypes ? tag.techTypes.join(', ') : 'Unknown',
                    ndef_data: ndefData,
                    scan_duration: scanDuration,
                    location: {
                      latitude: 0,
                      longitude: 0,
                    },
                    device_details: {
                      model: advancedInfo.deviceModel,
                      platform: Platform.OS,
                      version: Platform.Version,
                      appVersion: advancedInfo.appVersion,
                      screenSize: advancedInfo.screenSize,
                    },
                    network_info: {
                      status: deviceInfo.internet,
                      latency: deviceInfo.networkLatency,
                    },
                  }),
                });
                
                const data = await response.json();
                
                if (data.success || response.ok) {
                  await saveAttendanceRecord({ ...nfcRecord, type: 'nfc', syncStatus: 'success', serverResponse: data });
                  await updateSystemStats(true);
                  
                  Alert.alert(
                    '✅ Attendance Recorded!',
                    `NFC UID: ${uid}\n` +
                    `Time: ${new Date().toLocaleTimeString()}\n` +
                    `Scan Duration: ${scanDuration}ms\n` +
                    `Server: Synced`,
                    [{ text: 'Done' }]
                  );
                } else {
                  throw new Error(data.message || 'Server returned error');
                }
                
              } catch (scanError) {
                await NfcManager.cancelTechnologyRequest();
                await logError('NFC_SCAN', 'NFC scan failed', {
                  error: scanError.message,
                  stack: scanError.stack,
                  timestamp: new Date().toISOString(),
                });
                await updateSystemStats(false);
                
                Alert.alert(
                  '❌ Scan Failed',
                  `Error: ${scanError.message}\n\n` +
                  'Make sure NFC is enabled in your phone settings and hold the card steady.\n\n' +
                  'Error logged for diagnostics.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      await logError('NFC_INIT', 'NFC initialization failed', {
        error: error.message,
        stack: error.stack,
      });
      
      Alert.alert(
        '❌ NFC Error',
        `Could not initialize NFC reader.\n\n` +
        `Error: ${error.message}\n\n` +
        'Make sure NFC is enabled in Settings.\n\n' +
        'Error logged for diagnostics.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📱 Attendance Kiosk</Text>
          <Text style={styles.subtitle}>Complete System Diagnostics</Text>
        </View>

        {/* Device Status Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 DEVICE STATUS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Platform:</Text>
            <Text style={styles.value}>{deviceInfo.platform}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>{deviceInfo.version}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Internet:</Text>
            <Text style={styles.value}>{deviceInfo.internet}</Text>
          </View>
        </View>

        {/* Hardware Capabilities Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 HARDWARE CAPABILITIES</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fingerprint Scanner:</Text>
            <Text style={styles.value}>{deviceInfo.fingerprint}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NFC Reader:</Text>
            <Text style={styles.value}>{deviceInfo.nfc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>USB Barcode Scanner:</Text>
            <Text style={styles.value}>{deviceInfo.usbHost}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GPS Location:</Text>
            <Text style={styles.value}>{deviceInfo.gps}</Text>
          </View>
        </View>

        {/* Server Configuration Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 SERVER CONNECTION</Text>
          <Text style={styles.serverUrl}>
            https://darkviolet-dotterel-146840.hostingersite.com
          </Text>
          <Text style={styles.serverStatus}>Status: {deviceInfo.internet === '✅ Connected' ? 'Active' : 'Testing...'}</Text>
          <TouchableOpacity style={styles.editButton} onPress={testServerConnection}>
            <Text style={styles.editButtonText}>✏️ Test / Edit</Text>
          </TouchableOpacity>
        </View>

        {/* User Enrollment Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 USER ENROLLMENT MODULE</Text>
          <Text style={styles.subModuleTitle}>Enrolled Users ({enrolledUsers.length}):</Text>
          {enrolledUsers.length > 0 ? (
            enrolledUsers.map((user, index) => (
              <View key={index} style={styles.enrolledUserRow}>
                <Text style={styles.enrolledUserText}>
                  ✅ {user.name} ({user.id}) - {user.role}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No users enrolled yet</Text>
          )}
          
          <Text style={styles.subModuleTitle}>Add New User:</Text>
          <View style={styles.pickerContainer}>
            {USERS_DATABASE.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userOption,
                  selectedUserId === user.id && styles.userOptionSelected
                ]}
                onPress={() => setSelectedUserId(user.id)}>
                <Text style={styles.userOptionText}>
                  {user.name} - {user.id} ({user.role})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedUserId && (
            <TouchableOpacity style={styles.enrollButton} onPress={enrollFingerprint}>
              <Text style={styles.buttonText}>📝 ENROLL SELECTED USER</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attendance Module - Action Buttons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✋ ATTENDANCE ACTIONS</Text>
          <Text style={styles.subModuleTitle}>Nothing Phone 2 Features:</Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={readFingerprint}>
            <Text style={styles.buttonText}>👆 IN-DISPLAY FINGERPRINT</Text>
            <Text style={styles.buttonSubtext}>Use your fingerprint scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nfcButton} onPress={readRFIDTag}>
            <Text style={styles.buttonText}>📡 NFC / RFID READER</Text>
            <Text style={styles.buttonSubtext}>Tap NFC card to phone back</Text>
          </TouchableOpacity>
        </View>

        {/* System Utilities Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚙️ SYSTEM UTILITIES</Text>
          
          <TouchableOpacity style={styles.utilityButton} onPress={testServerConnection}>
            <Text style={styles.buttonText}>🧪 TEST SERVER CONNECTION</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityButton} onPress={requestGPSPermission}>
            <Text style={styles.buttonText}>📍 REQUEST GPS PERMISSION</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityButton} onPress={checkDeviceCapabilities}>
            <Text style={styles.buttonText}>🔄 REFRESH STATUS</Text>
          </TouchableOpacity>
        </View>

        {/* System Statistics Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 SYSTEM STATISTICS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Scans:</Text>
            <Text style={styles.value}>{systemStats.totalScans}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Successful:</Text>
            <Text style={styles.valueSuccess}>{systemStats.successfulScans}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Failed:</Text>
            <Text style={styles.valueFailed}>{systemStats.failedScans}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Success Rate:</Text>
            <Text style={styles.value}>
              {systemStats.totalScans > 0 
                ? `${((systemStats.successfulScans / systemStats.totalScans) * 100).toFixed(1)}%`
                : '0%'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Last Sync:</Text>
            <Text style={styles.valueSmall}>
              {systemStats.lastSyncTime 
                ? new Date(systemStats.lastSyncTime).toLocaleString()
                : 'Never'}
            </Text>
          </View>
        </View>

        {/* Advanced Device Info Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔬 ADVANCED DIAGNOSTICS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Device Model:</Text>
            <Text style={styles.value}>{advancedInfo.deviceModel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Screen Size:</Text>
            <Text style={styles.value}>{advancedInfo.screenSize}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>App Version:</Text>
            <Text style={styles.value}>{advancedInfo.appVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Build Number:</Text>
            <Text style={styles.value}>{advancedInfo.buildNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Network Latency:</Text>
            <Text style={styles.value}>{deviceInfo.networkLatency || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Last Check:</Text>
            <Text style={styles.valueSmall}>{deviceInfo.lastCheck || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check Duration:</Text>
            <Text style={styles.value}>{deviceInfo.checkDuration || 'N/A'}</Text>
          </View>
        </View>

        {/* Attendance History Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 ATTENDANCE HISTORY (Last {Math.min(attendanceHistory.length, 10)})</Text>
          {attendanceHistory.length > 0 ? (
            attendanceHistory.slice(0, 10).map((record, index) => (
              <View key={record.id || index} style={[
                styles.historyRow,
                record.syncStatus === 'success' ? styles.historySuccess : styles.historyFailed
              ]}>
                <Text style={styles.historyText}>
                  {record.type === 'nfc' ? '📡' : '👆'} {record.userName || record.uid}
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(record.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.historyStatus}>
                  {record.syncStatus === 'success' ? '✅' : '❌'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No attendance records yet</Text>
          )}
        </View>

        {/* Error Log Viewer Module */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🐛 ERROR LOG VIEWER (Last {Math.min(errorLogs.length, 20)})</Text>
          
          {errorLogs.length > 0 && (
            <TouchableOpacity style={styles.clearLogsButton} onPress={clearErrorLogs}>
              <Text style={styles.clearLogsButtonText}>🗑️ CLEAR ALL LOGS</Text>
            </TouchableOpacity>
          )}
          
          <ScrollView style={styles.errorLogScroll} nestedScrollEnabled={true}>
            {errorLogs.length > 0 ? (
              errorLogs.slice(0, 20).map((log, index) => (
                <View key={log.id || index} style={styles.errorLogRow}>
                  <View style={styles.errorLogHeader}>
                    <Text style={styles.errorLogType}>[{log.type}]</Text>
                    <Text style={styles.errorLogTime}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.errorLogMessage}>{log.message}</Text>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <Text style={styles.errorLogDetails}>
                      {JSON.stringify(log.details, null, 2)}
                    </Text>
                  )}
                  <Text style={styles.errorLogPlatform}>
                    Platform: {log.platform} {log.version}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>✅ No errors logged</Text>
            )}
          </ScrollView>
        </View>

        {/* Help & Instructions Module */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 SYSTEM CHECKLIST</Text>
          <Text style={styles.infoText}>
            ✓ Internet should show "✅ Connected"{'\n'}
            ✓ GPS should show "✅ Permission Granted"{'\n'}
            ✓ Fingerprint scanner available on real devices{'\n'}
            ✓ USB Scanner can be plugged in anytime{'\n'}
            ✓ Test server button should return success{'\n'}
            ✓ Enroll users before marking attendance{'\n'}
            ✓ Monitor error logs for diagnostics{'\n'}
            ✓ Check system statistics regularly
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Build: {advancedInfo.buildNumber}</Text>
          <Text style={styles.footerText}>Version: {advancedInfo.appVersion}</Text>
          <Text style={styles.footerText}>Environment: Production</Text>
          <Text style={styles.footerTextSmall}>Hostinger Server Active</Text>
          <Text style={styles.footerTextSmall}>Error Logs: {errorLogs.length} | Records: {attendanceHistory.length}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollView: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 25,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 15,
    color: 'white',
    marginTop: 5,
    opacity: 0.95,
  },
  
  // Card Module Style
  card: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingBottom: 8,
  },
  subModuleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: 'bold',
  },
  
  // Server Module
  serverUrl: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#edf2f7',
    borderRadius: 6,
  },
  serverStatus: {
    fontSize: 14,
    color: '#38a169',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#ed8936',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // User Enrollment Module
  enrolledUserRow: {
    backgroundColor: '#e6fffa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#38b2ac',
  },
  enrolledUserText: {
    fontSize: 13,
    color: '#234e52',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 13,
    color: '#a0aec0',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  pickerContainer: {
    marginVertical: 10,
  },
  userOption: {
    padding: 14,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  userOptionSelected: {
    backgroundColor: '#ebf8ff',
    borderColor: '#4299e1',
    borderWidth: 2,
  },
  userOptionText: {
    fontSize: 14,
    color: '#2d3748',
  },
  
  // Action Buttons
  enrollButton: {
    backgroundColor: '#f39c12',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#9b59b6',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  nfcButton: {
    backgroundColor: '#16a085',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  utilityButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  
  // Info Box Module
  infoBox: {
    backgroundColor: '#fffbeb',
    padding: 18,
    borderRadius: 10,
    marginVertical: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#fbbf24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#78350f',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 22,
  },
  
  // Stats Values
  valueSuccess: {
    fontSize: 14,
    color: '#38a169',
    fontWeight: 'bold',
  },
  valueFailed: {
    fontSize: 14,
    color: '#e53e3e',
    fontWeight: 'bold',
  },
  valueSmall: {
    fontSize: 11,
    color: '#4a5568',
    fontWeight: '500',
  },
  
  // Attendance History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  historySuccess: {
    backgroundColor: '#f0fff4',
    borderLeftColor: '#38a169',
  },
  historyFailed: {
    backgroundColor: '#fff5f5',
    borderLeftColor: '#e53e3e',
  },
  historyText: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
    flex: 2,
  },
  historyTime: {
    fontSize: 11,
    color: '#718096',
    flex: 2,
  },
  historyStatus: {
    fontSize: 16,
    flex: 0.5,
    textAlign: 'right',
  },
  
  // Error Log Viewer
  errorLogScroll: {
    maxHeight: 400,
  },
  errorLogRow: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
  },
  errorLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  errorLogType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#c53030',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorLogTime: {
    fontSize: 10,
    color: '#718096',
  },
  errorLogMessage: {
    fontSize: 13,
    color: '#2d3748',
    marginBottom: 6,
    fontWeight: '500',
  },
  errorLogDetails: {
    fontSize: 11,
    color: '#4a5568',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  errorLogPlatform: {
    fontSize: 10,
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  clearLogsButton: {
    backgroundColor: '#e53e3e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearLogsButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  footerTextSmall: {
    fontSize: 11,
    color: '#a0aec0',
  },
});

export default App;
