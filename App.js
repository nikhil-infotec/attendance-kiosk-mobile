import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NfcManager from 'react-native-nfc-manager';

// Import Services
import offlineSyncManager from './services/OfflineSyncManager';
import analyticsService from './services/AnalyticsService';
import ToastService, { ToastManager } from './services/ToastService';

// Import Components
import AppLock from './components/AppLock';
import OfflineIndicator from './components/OfflineIndicator';

// Import Screens
import HomeScreen from './screens/HomeScreen';
import EnrollScreen from './screens/EnrollScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import HistoryScreen from './screens/HistoryScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [systemData, setSystemData] = useState({
    enrolledUsers: [],
    errorLogs: [],
    attendanceHistory: [],
    systemStats: {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      lastSyncTime: null,
    },
  });

  useEffect(() => {
    initializeApp();
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize offline sync manager
      const isOnline = await offlineSyncManager.initialize();
      console.log('Offline Sync initialized:', isOnline ? 'Online' : 'Offline');

      // Subscribe to sync events
      offlineSyncManager.subscribe((event) => {
        if (event.online !== undefined) {
          console.log('Network status changed:', event.online ? 'Online' : 'Offline');
        }

        if (event.syncCompleted) {
          const { succeeded, failed } = event.results;
          if (succeeded > 0) {
            ToastService.success(`✅ Synced ${succeeded} record(s)`);
          }
          if (failed > 0) {
            ToastService.error(`❌ Failed to sync ${failed} record(s)`);
          }
        }
      });

      // Initialize analytics
      await analyticsService.init();
      await analyticsService.trackEvent('app', 'launch', 'startup');
      
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  };

  const initializeApp = async () => {
    try {
      // Initialize NFC
      const nfcSupported = await NfcManager.isSupported();
      if (nfcSupported) {
        await NfcManager.start();
      }

      // Load all saved data
      const [enrolled, logs, history, stats] = await Promise.all([
        AsyncStorage.getItem('enrolledUsers'),
        AsyncStorage.getItem('errorLogs'),
        AsyncStorage.getItem('attendanceHistory'),
        AsyncStorage.getItem('systemStats'),
      ]);

      setSystemData({
        enrolledUsers: enrolled ? JSON.parse(enrolled) : [],
        errorLogs: logs ? JSON.parse(logs) : [],
        attendanceHistory: history ? JSON.parse(history) : [],
        systemStats: stats ? JSON.parse(stats) : {
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,
          lastSyncTime: null,
        },
      });
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  };

  const updateSystemData = async (key, value) => {
    const newData = { ...systemData, [key]: value };
    setSystemData(newData);
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const logError = async (errorType, errorMessage, errorDetails = {}) => {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: errorType,
      message: errorMessage,
      details: errorDetails,
      platform: Platform.OS,
    };
    
    const newErrorLogs = [errorEntry, ...systemData.errorLogs].slice(0, 100);
    updateSystemData('errorLogs', newErrorLogs);
  };

  const handleOfflineIndicatorPress = ({ isOnline, queueStatus }) => {
    if (!isOnline) {
      ToastService.warning('You are offline. Attendance will be queued.');
    } else if (queueStatus.pending > 0) {
      ToastService.info(`${queueStatus.pending} record(s) waiting to sync`);
    }
  };

  const renderScreen = () => {
    const screenProps = {
      systemData,
      updateSystemData,
      logError,
      navigateTo: setCurrentScreen,
    };

    switch (currentScreen) {
      case 'home':
        return <HomeScreen {...screenProps} />;
      case 'enroll':
        return <EnrollScreen {...screenProps} />;
      case 'attendance':
        return <AttendanceScreen {...screenProps} />;
      case 'diagnostics':
        return <DiagnosticsScreen {...screenProps} />;
      case 'history':
        return <HistoryScreen {...screenProps} />;
      default:
        return <HomeScreen {...screenProps} />;
    }
  };

  return (
    <AppLock>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

        {/* Offline Indicator */}
        <OfflineIndicator onPress={handleOfflineIndicatorPress} />

        {/* Screen Content */}
        <View style={styles.content}>
          {renderScreen()}
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, currentScreen === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'enroll' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('enroll')}>
          <Text style={styles.navIcon}>➕</Text>
          <Text style={[styles.navText, currentScreen === 'enroll' && styles.navTextActive]}>Enroll</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'attendance' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('attendance')}>
          <Text style={styles.navIcon}>✋</Text>
          <Text style={[styles.navText, currentScreen === 'attendance' && styles.navTextActive]}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'history' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('history')}>
          <Text style={styles.navIcon}>📜</Text>
          <Text style={[styles.navText, currentScreen === 'history' && styles.navTextActive]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'diagnostics' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('diagnostics')}>
          <Text style={styles.navIcon}>🔧</Text>
          <Text style={[styles.navText, currentScreen === 'diagnostics' && styles.navTextActive]}>Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Toast Manager */}
      <ToastManager ref={(ref) => ToastService.setRef(ref)} />
    </SafeAreaView>
    </AppLock>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'relative',
    zIndex: 1000,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 3,
  },
  navButtonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  navIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  navText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  navTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
