/**
 * Mobile Attendance Kiosk
 * Captures RFID/Fingerprint input via USB-OTG HID reader
 * Implements GPS geofencing and secure data transmission
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ==================== CONFIGURATION ====================
const CONFIG = {
  // PRODUCTION: Hostinger deployment
  API_ENDPOINT: 'https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/sync.php',
  DEBUG_LOG_API: 'https://darkviolet-dotterel-146840.hostingersite.com/attendance/api/log_debug.php',
  
  // IMPORTANT: Change this token for each device/kiosk
  DEVICE_TOKEN: 'kiosk_main_gate_2024',
  
  // School GPS Boundary (Geofence)
  // Get coordinates from Google Maps: Right-click location → Click coordinates
  SCHOOL_LOCATION: {
    latitude: 28.6139,   // Replace with your school's latitude
    longitude: 77.2090,  // Replace with your school's longitude
    radius: 5000,        // Geofence radius in meters (5km)
    longitude: 77.5946, // Replace with actual school longitude
    radiusMeters: 5000,  // Increased for testing (5km)
  },
  
  // Timing Configuration
  SCAN_COOLDOWN_MS: 2000, // Prevent duplicate scans within 2 seconds
  GPS_TIMEOUT_MS: 10000,  // GPS acquisition timeout
};

const App = () => {
  const [rfidInput, setRfidInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to scan...');
  const [scanCount, setScanCount] = useState(0);
  const [debugLogCount, setDebugLogCount] = useState(0);
  
  const inputRef = useRef(null);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    initializeApp();
    
    // Keep input focused at all times
    const focusInterval = setInterval(() => {
      if (inputRef.current && !isProcessing) {
        inputRef.current.focus();
      }
    }, 500);

    return () => clearInterval(focusInterval);
  }, [isProcessing]);

  const initializeApp = async () => {
    // Request location permissions
    await requestLocationPermission();
    
    // Get or generate device ID
    const storedDeviceId = await AsyncStorage.getItem('DEVICE_ID');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `KIOSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('DEVICE_ID', newDeviceId);
      setDeviceId(newDeviceId);
    }
    
    setStatusMessage('Ready - Waiting for scan...');
  };

  // ==================== PERMISSIONS ====================
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for geofencing.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // ==================== GEOFENCING ====================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        error => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: CONFIG.GPS_TIMEOUT_MS,
          maximumAge: 1000,
        },
      );
    });
  };

  const isWithinGeofence = async () => {
    try {
      const location = await getCurrentLocation();
      
      const distance = calculateDistance(
        CONFIG.SCHOOL_LOCATION.latitude,
        CONFIG.SCHOOL_LOCATION.longitude,
        location.latitude,
        location.longitude,
      );

      console.log(`Distance from school: ${distance.toFixed(2)}m`);

      return {
        isInside: distance <= CONFIG.SCHOOL_LOCATION.radiusMeters,
        location: location,
        distance: distance,
      };
    } catch (error) {
      console.error('Location error:', error);
      throw new Error('Unable to get GPS location');
    }
  };

  // ==================== RFID SCAN HANDLER ====================
  const handleRfidScan = async (uid) => {
    // Trim and clean the input
    const cleanUid = uid.trim();
    
    if (!cleanUid || cleanUid.length < 4) {
      return; // Ignore invalid scans
    }

    // Prevent duplicate scans (cooldown period)
    const currentTime = Date.now();
    if (currentTime - lastScanTime < CONFIG.SCAN_COOLDOWN_MS) {
      setStatusMessage('⚠️ Please wait between scans');
      return;
    }

    setLastScanTime(currentTime);
    setIsProcessing(true);
    setStatusMessage('📍 Checking location...');

    try {
      // Step 1: Check geofence
      const geofenceResult = await isWithinGeofence();
      
      if (!geofenceResult.isInside) {
        setStatusMessage(`❌ Outside school boundary (${geofenceResult.distance.toFixed(0)}m away)`);
        Alert.alert(
          'Location Error',
          `You are outside the school boundary. Distance: ${geofenceResult.distance.toFixed(0)}m`,
          [{text: 'OK'}],
        );
        setIsProcessing(false);
        return;
      }

      setStatusMessage('📡 Sending to server...');

      // Step 2: Prepare payload
      const timestamp = new Date().toISOString();
      const payload = {
        uid: cleanUid,
        device_id: deviceId,
        timestamp: timestamp,
        location: {
          latitude: geofenceResult.location.latitude,
          longitude: geofenceResult.location.longitude,
          accuracy: geofenceResult.location.accuracy,
        },
      };

      // Step 3: Send to backend
      const response = await axios.post(CONFIG.API_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': CONFIG.DEVICE_TOKEN,
          'X-Device-ID': deviceId,
        },
        timeout: 10000,
      });

      if (response.data.success) {
        setScanCount(prev => prev + 1);
        setStatusMessage(`✅ Success! (${scanCount + 1} scans)`);
        
        // Visual feedback
        setTimeout(() => {
          setStatusMessage('Ready - Waiting for scan...');
        }, 2000);
      } else {
        setStatusMessage(`❌ Server Error: ${response.data.message || 'Unknown error'}`);
        Alert.alert('Server Error', response.data.message || 'Failed to record attendance');
      }

    } catch (error) {
      console.error('Scan error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error.message.includes('GPS')) {
        errorMessage = 'GPS location unavailable';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Server timeout - check connection';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No server response - check internet';
      }
      
      setStatusMessage(`❌ ${errorMessage}`);
      Alert.alert('Error', errorMessage);
      
      // Log error to server
      await sendDebugLog('error', errorMessage, {
        uid: cleanUid,
        error: error.message,
        stack: error.stack,
      });
      
      // Store offline for retry (optional enhancement)
      await storeOfflineScan(cleanUid);
      
    } finally {
      setIsProcessing(false);
      // Clear input for next scan
      setRfidInput('');
      // Re-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // ==================== OFFLINE STORAGE ====================
  const storeOfflineScan = async (uid) => {
    try {
      const offlineScans = await AsyncStorage.getItem('OFFLINE_SCANS');
      const scans = offlineScans ? JSON.parse(offlineScans) : [];
      
      scans.push({
        uid: uid,
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        synced: false,
      });
      
      await AsyncStorage.setItem('OFFLINE_SCANS', JSON.stringify(scans));
      console.log('Stored offline scan for later sync');
    } catch (error) {
      console.error('Failed to store offline scan:', error);
    }
  };

  // ==================== DEBUG LOGGING ====================
  const sendDebugLog = async (type, message, details = {}) => {
    try {
      await axios.post(CONFIG.DEBUG_LOG_API, {
        device_id: deviceId,
        log_type: type, // 'error', 'warning', 'info', 'success'
        message: message,
        details: details,
      }, {
        timeout: 5000,
      });
      setDebugLogCount(prev => prev + 1);
      console.log(`Debug log sent: ${type} - ${message}`);
    } catch (error) {
      console.error('Failed to send debug log:', error.message);
    }
  };

  const testDebugLog = () => {
    Alert.alert(
      'Send Test Log',
      'Choose log type to send:',
      [
        {
          text: 'Info',
          onPress: () => sendDebugLog('info', 'Test info log from mobile app', {
            test: true,
            timestamp: new Date().toISOString(),
            deviceInfo: Platform.OS + ' ' + Platform.Version,
          }),
        },
        {
          text: 'Warning',
          onPress: () => sendDebugLog('warning', 'Test warning - Scanner disconnected', {
            test: true,
          }),
        },
        {
          text: 'Error',
          onPress: () => sendDebugLog('error', 'Test error - GPS timeout', {
            test: true,
            errorCode: 'GPS_TIMEOUT',
          }),
        },
        {
          text: 'Success',
          onPress: () => sendDebugLog('success', 'Test success - All systems working', {
            test: true,
            scanCount: scanCount,
          }),
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  // ==================== UI RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎓</Text>
        <Text style={styles.title}>Attendance Kiosk</Text>
        <Text style={styles.subtitle}>Scan your card to mark attendance</Text>
      </View>

      {/* Main Status Area */}
      <View style={styles.mainContent}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.processingText}>{statusMessage}</Text>
          </View>
        ) : (
          <View style={styles.readyContainer}>
            <View style={styles.scanIcon}>
              <Text style={styles.scanIconText}>📱</Text>
            </View>
            <Text style={styles.readyText}>Ready to Scan</Text>
            <Text style={styles.instructionText}>
              {statusMessage}
            </Text>
          </View>
        )}

        {/* Success/Error Display */}
        {statusMessage.includes('✅') && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{statusMessage}</Text>
          </View>
        )}
        
        {statusMessage.includes('❌') && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{statusMessage}</Text>
          </View>
        )}
      </View>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{scanCount}</Text>
          <Text style={styles.statLabel}>Scans Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{deviceId ? '🟢' : '🔴'}</Text>
          <Text style={styles.statLabel}>Device Status</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statBox} onPress={testDebugLog}>
          <Text style={styles.statNumber}>🐛</Text>
          <Text style={styles.statLabel}>Debug Log ({debugLogCount})</Text>
        </TouchableOpacity>
      </View>

      {/* Hidden input field for USB HID keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={rfidInput}
        onChangeText={setRfidInput}
        onSubmitEditing={() => handleRfidScan(rfidInput)}
        autoFocus={true}
        returnKeyType="done"
        keyboardType="default"
        blurOnSubmit={false}
        editable={!isProcessing}
        placeholder=""
        placeholderTextColor="#888"
      />
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e3f2fd',
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  readyContainer: {
    alignItems: 'center',
    width: '100%',
  },
  scanIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  scanIconText: {
    fontSize: 60,
  },
  readyText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 20,
    color: '#667eea',
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#f44336',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e0e0e0',
  },
  hiddenInput: {
    position: 'absolute',
    bottom: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default App;
