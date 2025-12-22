/**
 * Toast Notification Service
 * 
 * Provides beautiful, non-intrusive notifications for user feedback
 * Built-in types: success, error, warning, info
 */

import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';
import React, { Component } from 'react';
import HapticFeedback from '../utils/HapticFeedback';

const { width } = Dimensions.get('window');

class ToastManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      message: '',
      type: 'info',
    };
    this.animatedValue = new Animated.Value(-100);
    this.hideTimeout = null;
  }

  show(message, type = 'info', duration = 3000) {
    // Provide haptic feedback
    switch (type) {
      case 'success':
        HapticFeedback.success();
        break;
      case 'error':
        HapticFeedback.error();
        break;
      case 'warning':
        HapticFeedback.warning();
        break;
      default:
        HapticFeedback.light();
    }

    this.setState(
      {
        visible: true,
        message,
        type,
      },
      () => {
        // Slide down animation
        Animated.spring(this.animatedValue, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();

        // Auto-hide after duration
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
          this.hide();
        }, duration);
      }
    );
  }

  hide() {
    // Slide up animation
    Animated.timing(this.animatedValue, {
      toValue: -100,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      this.setState({ visible: false });
    });
  }

  render() {
    if (!this.state.visible) return null;

    const { type, message } = this.state;

    const backgroundColor = {
      success: '#10b981', // Green
      error: '#ef4444', // Red
      warning: '#f59e0b', // Orange
      info: '#3b82f6', // Blue
    }[type] || '#3b82f6';

    const icon = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    }[type] || 'ℹ️';

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            transform: [{ translateY: this.animatedValue }],
          },
        ]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Animated.View>
    );
  }
}

// Singleton instance
let toastRef = null;

// Create styles
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999,
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
});

// Export Toast Service
const ToastService = {
  /**
   * Set the toast manager reference
   * Call this in your root App.js
   */
  setRef: (ref) => {
    toastRef = ref;
  },

  /**
   * Show a success toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  success: (message, duration = 3000) => {
    toastRef?.show(message, 'success', duration);
  },

  /**
   * Show an error toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3500)
   */
  error: (message, duration = 3500) => {
    toastRef?.show(message, 'error', duration);
  },

  /**
   * Show a warning toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  warning: (message, duration = 3000) => {
    toastRef?.show(message, 'warning', duration);
  },

  /**
   * Show an info toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  info: (message, duration = 3000) => {
    toastRef?.show(message, 'info', duration);
  },

  /**
   * Show a custom toast
   * @param {string} message - Message to display
   * @param {string} type - Type: success, error, warning, info
   * @param {number} duration - Duration in milliseconds
   */
  show: (message, type = 'info', duration = 3000) => {
    toastRef?.show(message, type, duration);
  },

  /**
   * Hide the current toast
   */
  hide: () => {
    toastRef?.hide();
  },
};

export default ToastService;
export { ToastManager };

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Add ToastManager to your root App.js:
 * 
 * import ToastService, { ToastManager } from './services/ToastService';
 * 
 * function App() {
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <NavigationContainer>
 *         // Your app navigation
 *       </NavigationContainer>
 *       <ToastManager ref={(ref) => ToastService.setRef(ref)} />
 *     </View>
 *   );
 * }
 * 
 * 2. Use anywhere in your app:
 * 
 * import ToastService from './services/ToastService';
 * 
 * // Success
 * ToastService.success('Attendance recorded successfully!');
 * 
 * // Error
 * ToastService.error('Failed to connect to server');
 * 
 * // Warning
 * ToastService.warning('Battery low - charge device');
 * 
 * // Info
 * ToastService.info('3 pending records will sync when online');
 * 
 * // Custom
 * ToastService.show('Custom message', 'success', 5000);
 */
