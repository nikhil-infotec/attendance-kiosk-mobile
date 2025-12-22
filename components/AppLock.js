/**
 * App Lock Component
 * 
 * Provides biometric authentication to lock the app
 * Enhances security by requiring fingerprint/face unlock
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticFeedback from '../utils/HapticFeedback';

const LOCK_ENABLED_KEY = 'app_lock_enabled';
const rnBiometrics = new ReactNativeBiometrics();

const AppLock = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometryType, setBiometryType] = useState(null);
  const [error, setError] = useState('');
  const [lockEnabled, setLockEnabled] = useState(false);

  useEffect(() => {
    checkBiometricAndLockStatus();
  }, []);

  const checkBiometricAndLockStatus = async () => {
    try {
      // Check if app lock is enabled
      const lockEnabledStr = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
      const enabled = lockEnabledStr === 'true';
      setLockEnabled(enabled);

      // If lock not enabled, allow access
      if (!enabled) {
        setIsUnlocked(true);
        setIsLoading(false);
        return;
      }

      // Check biometric availability
      const { available, biometryType: type } = await rnBiometrics.isSensorAvailable();

      if (available) {
        setBiometryType(type);
        setIsLoading(false);
        // Auto-prompt for biometric
        setTimeout(() => unlock(), 500);
      } else {
        // No biometric available, unlock anyway
        setIsUnlocked(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Lock check error:', error);
      setIsUnlocked(true); // Fail-safe: unlock on error
      setIsLoading(false);
    }
  };

  const unlock = async () => {
    try {
      setError('');

      const { success, error: biometricError } = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock Attendance App',
        cancelButtonText: 'Cancel',
      });

      if (success) {
        HapticFeedback.success();
        setIsUnlocked(true);
      } else {
        HapticFeedback.error();
        setError(biometricError || 'Authentication failed');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      HapticFeedback.error();
      setError('Biometric authentication failed');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!lockEnabled || isUnlocked) {
    return children;
  }

  return (
    <View style={styles.lockScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      <View style={styles.lockContent}>
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* App Title */}
        <Text style={styles.appTitle}>Attendance System</Text>
        <Text style={styles.lockSubtitle}>App Locked</Text>

        {/* Biometric Type Info */}
        {biometryType && (
          <Text style={styles.biometricInfo}>
            {biometryType === 'FaceID' ? '👤 Face ID' : 
             biometryType === 'TouchID' || biometryType === 'Biometrics' ? '👆 Fingerprint' : 
             'Biometric'}
          </Text>
        )}

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        ) : null}

        {/* Unlock Button */}
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={() => {
            HapticFeedback.medium();
            unlock();
          }}
          activeOpacity={0.7}>
          <Text style={styles.unlockButtonText}>
            {biometryType === 'FaceID' ? 'Unlock with Face ID' : 
             biometryType === 'TouchID' || biometryType === 'Biometrics' ? 'Unlock with Fingerprint' : 
             'Unlock'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Use your device biometric to access the app
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
  },
  lockScreen: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 60,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 16,
  },
  biometricInfo: {
    fontSize: 16,
    color: '#3b82f6',
    marginBottom: 24,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 250,
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  unlockButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  infoText: {
    marginTop: 24,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Export utility functions
export const AppLockUtils = {
  /**
   * Enable app lock
   */
  enable: async () => {
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'true');
  },

  /**
   * Disable app lock
   */
  disable: async () => {
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'false');
  },

  /**
   * Check if app lock is enabled
   */
  isEnabled: async () => {
    const enabled = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
    return enabled === 'true';
  },

  /**
   * Check if biometric is available on device
   */
  isBiometricAvailable: async () => {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  },
};

export default AppLock;

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Wrap your root app component:
 * 
 * import AppLock from './components/AppLock';
 * 
 * function App() {
 *   return (
 *     <AppLock>
 *       <NavigationContainer>
 *         // Your app navigation
 *       </NavigationContainer>
 *     </AppLock>
 *   );
 * }
 * 
 * 2. Enable/disable from settings screen:
 * 
 * import { AppLockUtils } from './components/AppLock';
 * 
 * // Enable lock
 * await AppLockUtils.enable();
 * 
 * // Disable lock
 * await AppLockUtils.disable();
 * 
 * // Check if enabled
 * const enabled = await AppLockUtils.isEnabled();
 * 
 * // Check biometric availability
 * const { available, biometryType } = await AppLockUtils.isBiometricAvailable();
 */
