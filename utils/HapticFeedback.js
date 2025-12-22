/**
 * Haptic Feedback Utility
 * 
 * Provides tactile feedback for user interactions
 * Improves UX by giving physical confirmation of actions
 */

import { Vibration, Platform } from 'react-native';

const HapticFeedback = {
  /**
   * Light tap feedback
   * Use for: Button taps, switch toggles
   */
  light: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(10);
    }
  },

  /**
   * Medium impact feedback
   * Use for: Selection changes, picker scrolls
   */
  medium: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    }
  },

  /**
   * Heavy impact feedback
   * Use for: Errors, warnings, important actions
   */
  heavy: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(50);
    }
  },

  /**
   * Success pattern
   * Use for: Successful operations, confirmations
   */
  success: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 10, 20, 10]); // Quick double tap
    }
  },

  /**
   * Error pattern
   * Use for: Failed operations, validation errors
   */
  error: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 50, 100, 50]); // Stronger double tap
    }
  },

  /**
   * Warning pattern
   * Use for: Warnings, important notifications
   */
  warning: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 30, 60, 30]); // Medium double tap
    }
  },

  /**
   * Selection feedback
   * Use for: When user selects from a list
   */
  selection: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(15);
    }
  },

  /**
   * Impact feedback for biometric actions
   * Use for: Fingerprint, face recognition, NFC
   */
  biometric: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 20, 40, 20]);
    }
  },

  /**
   * Scanning feedback
   * Use for: Barcode/QR scanning, NFC reading
   */
  scan: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(25);
    }
  },

  /**
   * Long press feedback
   * Use for: Long press actions, context menus
   */
  longPress: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(40);
    }
  },

  /**
   * Notification feedback
   * Use for: New data arrived, sync completed
   */
  notification: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 15, 30, 15, 30]);
    }
  },

  /**
   * Custom vibration pattern
   * @param {number[]} pattern - Vibration pattern [wait, vibrate, wait, vibrate, ...]
   */
  custom: (pattern) => {
    if (Platform.OS === 'android' && Array.isArray(pattern)) {
      Vibration.vibrate(pattern);
    }
  },

  /**
   * Cancel any ongoing vibration
   */
  cancel: () => {
    Vibration.cancel();
  },
};

export default HapticFeedback;

/**
 * USAGE EXAMPLES:
 * 
 * // Button press
 * <TouchableOpacity onPress={() => {
 *   HapticFeedback.light();
 *   handlePress();
 * }}>
 *   <Text>Tap Me</Text>
 * </TouchableOpacity>
 * 
 * // Successful attendance
 * await recordAttendance();
 * HapticFeedback.success();
 * 
 * // Error validation
 * if (!isValid) {
 *   HapticFeedback.error();
 *   Alert.alert('Error', 'Invalid input');
 * }
 * 
 * // NFC scan
 * const card = await NfcManager.readTag();
 * HapticFeedback.scan();
 * 
 * // Face recognition match
 * const match = await recognizeFace();
 * if (match) {
 *   HapticFeedback.biometric();
 * }
 */
