/**
 * Offline Indicator Component
 * 
 * Shows network status and pending sync count
 * Provides visual feedback about connectivity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import offlineSyncManager from '../services/OfflineSyncManager';
import HapticFeedback from '../utils/HapticFeedback';

const { width } = Dimensions.get('window');

const OfflineIndicator = ({ onPress }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, failed: 0, syncing: false });
  const [slideAnim] = useState(new Animated.Value(-60));

  useEffect(() => {
    // Subscribe to network and sync events
    const unsubscribe = offlineSyncManager.subscribe((event) => {
      if (event.online !== undefined) {
        setIsOnline(event.online);
        HapticFeedback.light();
      }

      if (event.syncStarted) {
        updateQueueStatus();
      }

      if (event.syncCompleted) {
        updateQueueStatus();
        HapticFeedback.success();
      }
    });

    // Initial status check
    const checkStatus = async () => {
      const online = offlineSyncManager.checkOnlineStatus();
      setIsOnline(online);
      updateQueueStatus();
    };

    checkStatus();

    return () => {
      unsubscribe();
    };
  }, []);

  const updateQueueStatus = () => {
    const status = offlineSyncManager.getQueueStatus();
    setQueueStatus(status);
  };

  useEffect(() => {
    // Show/hide animation
    if (!isOnline || queueStatus.pending > 0 || queueStatus.failed > 0) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, queueStatus]);

  const handlePress = () => {
    HapticFeedback.light();
    if (onPress) {
      onPress({ isOnline, queueStatus });
    }
  };

  const handleForceSync = async () => {
    HapticFeedback.medium();
    await offlineSyncManager.forceSync();
  };

  if (isOnline && queueStatus.pending === 0 && queueStatus.failed === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: isOnline ? '#f59e0b' : '#ef4444',
        },
      ]}>
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>
            {queueStatus.syncing ? '🔄' : isOnline ? '🟡' : '🔴'}
          </Text>
        </View>

        {/* Status Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {queueStatus.syncing
              ? 'Syncing...'
              : isOnline
              ? 'Pending Sync'
              : 'Offline Mode'}
          </Text>
          <Text style={styles.subtitle}>
            {queueStatus.pending > 0 &&
              `${queueStatus.pending} record${queueStatus.pending > 1 ? 's' : ''} pending`}
            {queueStatus.failed > 0 &&
              ` • ${queueStatus.failed} failed`}
            {!isOnline && queueStatus.pending === 0 && 'No internet connection'}
          </Text>
        </View>

        {/* Sync Button */}
        {isOnline && queueStatus.pending > 0 && !queueStatus.syncing && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleForceSync}
            activeOpacity={0.7}>
            <Text style={styles.syncButtonText}>Sync</Text>
          </TouchableOpacity>
        )}

        {/* Loading Spinner */}
        {queueStatus.syncing && (
          <View style={styles.spinner}>
            <Text style={styles.spinnerText}>⟳</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    paddingTop: 30,
    paddingBottom: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 8,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  spinner: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  spinnerText: {
    fontSize: 20,
    color: '#fff',
    transform: [{ rotate: '0deg' }],
  },
});

export default OfflineIndicator;

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Add to your navigation container or root component:
 * 
 * import OfflineIndicator from './components/OfflineIndicator';
 * 
 * function App() {
 *   const handleIndicatorPress = ({ isOnline, queueStatus }) => {
 *     console.log('Network:', isOnline);
 *     console.log('Queue:', queueStatus);
 *     // Optionally navigate to diagnostics screen
 *   };
 * 
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <OfflineIndicator onPress={handleIndicatorPress} />
 *       <NavigationContainer>
 *         // Your app navigation
 *       </NavigationContainer>
 *     </View>
 *   );
 * }
 * 
 * 2. The indicator will automatically:
 *    - Show when offline
 *    - Show when there are pending records
 *    - Show when sync is in progress
 *    - Hide when online and no pending records
 * 
 * 3. Users can:
 *    - Tap to see details (if onPress provided)
 *    - Tap "Sync" button to manually sync pending records
 *    - See real-time sync progress
 */
