/**
 * SHARED STYLES - CENTRALIZED DESIGN SYSTEM
 * 
 * All common styles used across the app
 * Reduces duplication and ensures consistency
 * 
 * Color Palette:
 * - Primary: #1e293b (Dark Blue - Headers)
 * - Background: #f8fafc (Light Gray)
 * - Fingerprint: #3b82f6 (Blue)
 * - NFC: #10b981 (Green)
 * - Barcode: #a855f7 (Purple)
 * - Face: #f97316 (Orange)
 * - Success: #22c55e (Green)
 * - Error: #ef4444 (Red)
 * - Warning: #f59e0b (Amber)
 * - Info: #3b82f6 (Blue)
 */

import { StyleSheet, Platform } from 'react-native';

// ==================== COLOR CONSTANTS ====================
export const Colors = {
  // Primary Colors
  primary: '#1e293b',
  primaryLight: '#334155',
  primaryDark: '#0f172a',
  
  // Background Colors
  background: '#f8fafc',
  backgroundDark: '#e2e8f0',
  white: '#ffffff',
  
  // Method Colors
  fingerprint: '#3b82f6',
  nfc: '#10b981',
  barcode: '#a855f7',
  face: '#f97316',
  
  // Status Colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Text Colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  textWhite: '#ffffff',
  
  // Border Colors
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  
  // Shadow Colors
  shadow: '#000000',
};

// ==================== SPACING CONSTANTS ====================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

// ==================== TYPOGRAPHY ====================
export const Typography = {
  // Font Sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body: 14,
  small: 12,
  tiny: 10,
  
  // Font Weights
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

// ==================== BORDER RADIUS ====================
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
  round: 999,
};

// ==================== SHADOWS ====================
export const Shadows = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  colored: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// ==================== SHARED COMPONENT STYLES ====================
const SharedStyles = StyleSheet.create({
  // ==================== LAYOUT ====================
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  content: {
    padding: 0,
    paddingBottom: Spacing.xxxl,
  },
  
  contentPadded: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // ==================== MODERN HEADER ====================
  modernHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
    marginBottom: Spacing.xl,
    ...Shadows.large,
  },
  
  headerGradient: {
    alignItems: 'center',
  },
  
  headerIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  
  headerTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textWhite,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  
  headerSubtitle: {
    fontSize: Typography.h5,
    color: Colors.backgroundDark,
    textAlign: 'center',
    opacity: 0.9,
  },
  
  // ==================== CARDS ====================
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  
  cardTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  
  cardSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  
  // ==================== STATS CARD ====================
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  
  statValue: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  
  statLabel: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // ==================== BUTTONS ====================
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.large,
  },
  
  buttonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  
  buttonIcon: {
    fontSize: 24,
  },
  
  buttonContent: {
    flex: 1,
  },
  
  buttonTitle: {
    fontSize: Typography.h5,
    fontWeight: Typography.bold,
    color: Colors.textWhite,
    marginBottom: Spacing.xs,
  },
  
  buttonSubtitle: {
    fontSize: Typography.small,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  
  buttonArrow: {
    fontSize: Typography.h2,
    color: Colors.textWhite,
    fontWeight: Typography.bold,
  },
  
  // Method-specific button styles
  fingerprintButton: {
    backgroundColor: Colors.fingerprint,
    ...Shadows.colored(Colors.fingerprint),
  },
  
  nfcButton: {
    backgroundColor: Colors.nfc,
    ...Shadows.colored(Colors.nfc),
  },
  
  barcodeButton: {
    backgroundColor: Colors.barcode,
    ...Shadows.colored(Colors.barcode),
  },
  
  faceButton: {
    backgroundColor: Colors.face,
    ...Shadows.colored(Colors.face),
  },
  
  // ==================== FORMS ====================
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  
  label: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.h5,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  
  picker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  
  // ==================== TEXT STYLES ====================
  h1: {
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  
  h2: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  
  h3: {
    fontSize: Typography.h3,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  
  bodyText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  
  bodyTextSecondary: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  
  smallText: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
  },
  
  // ==================== MODALS ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.large,
  },
  
  modalTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  
  modalButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  
  modalButtonText: {
    color: Colors.textWhite,
    fontSize: Typography.h5,
    fontWeight: Typography.bold,
  },
  
  modalCancelButton: {
    backgroundColor: Colors.backgroundDark,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  
  modalCancelButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.h5,
    fontWeight: Typography.semiBold,
  },
  
  // ==================== LISTS ====================
  listItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  
  listItemTitle: {
    fontSize: Typography.h5,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  
  listItemSubtitle: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  
  // ==================== BADGES ====================
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
  },
  
  badgeSuccess: {
    backgroundColor: Colors.success + '20',
  },
  
  badgeError: {
    backgroundColor: Colors.error + '20',
  },
  
  badgeWarning: {
    backgroundColor: Colors.warning + '20',
  },
  
  badgeInfo: {
    backgroundColor: Colors.info + '20',
  },
  
  badgeText: {
    fontSize: Typography.small,
    fontWeight: Typography.semiBold,
  },
  
  badgeTextSuccess: {
    color: Colors.success,
  },
  
  badgeTextError: {
    color: Colors.error,
  },
  
  badgeTextWarning: {
    color: Colors.warning,
  },
  
  badgeTextInfo: {
    color: Colors.info,
  },
  
  // ==================== DIVIDERS ====================
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  
  dividerThick: {
    height: 2,
    backgroundColor: Colors.borderDark,
    marginVertical: Spacing.lg,
  },
  
  // ==================== EMPTY STATES ====================
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  
  emptyStateTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  
  emptyStateText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // ==================== CAMERA STYLES ====================
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  
  cameraHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  
  cameraTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.textWhite,
    textAlign: 'center',
  },
  
  cameraInstructions: {
    fontSize: Typography.body,
    color: Colors.textWhite,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  
  cameraCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.textWhite,
  },
  
  cameraCancelText: {
    color: Colors.textWhite,
    fontSize: Typography.h5,
    fontWeight: Typography.bold,
  },
  
  // ==================== LOADING STATES ====================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: Typography.h5,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  
  // ==================== SEARCH ====================
  searchSection: {
    marginBottom: Spacing.lg,
  },
  
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
  },
  
  // ==================== FILTER BUTTONS ====================
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  
  filterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.backgroundDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  
  filterButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  
  filterButtonTextActive: {
    color: Colors.textWhite,
  },
  
  // ==================== STATUS INDICATORS ====================
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  
  statusDotSuccess: {
    backgroundColor: Colors.success,
  },
  
  statusDotError: {
    backgroundColor: Colors.error,
  },
  
  statusDotWarning: {
    backgroundColor: Colors.warning,
  },
  
  statusDotInfo: {
    backgroundColor: Colors.info,
  },
  
  // ==================== PLATFORM SPECIFIC ====================
  ...(Platform.OS === 'ios' && {
    iosShadow: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
  }),
  
  ...(Platform.OS === 'android' && {
    androidElevation: {
      elevation: 5,
    },
  }),
});

// ==================== UTILITY FUNCTIONS ====================
export const getMethodColor = (method) => {
  switch (method) {
    case 'fingerprint':
      return Colors.fingerprint;
    case 'nfc':
      return Colors.nfc;
    case 'barcode':
      return Colors.barcode;
    case 'face':
      return Colors.face;
    default:
      return Colors.primary;
  }
};

export const getMethodIcon = (method) => {
  switch (method) {
    case 'fingerprint':
      return '👆';
    case 'nfc':
      return '📡';
    case 'barcode':
      return '📊';
    case 'face':
      return '👤';
    default:
      return '❓';
  }
};

export const getMethodName = (method) => {
  switch (method) {
    case 'fingerprint':
      return 'Fingerprint';
    case 'nfc':
      return 'NFC Card';
    case 'barcode':
      return 'Barcode';
    case 'face':
      return 'Face Recognition';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'success':
      return Colors.success;
    case 'failed':
    case 'error':
      return Colors.error;
    case 'warning':
      return Colors.warning;
    case 'pending':
      return Colors.warning;
    default:
      return Colors.info;
  }
};

// ==================== RESPONSIVE HELPERS ====================
export const responsive = {
  // Screen breakpoints
  isSmallScreen: (width) => width < 360,
  isMediumScreen: (width) => width >= 360 && width < 768,
  isLargeScreen: (width) => width >= 768,
  
  // Adaptive spacing
  spacing: (base, width) => {
    if (width < 360) return base * 0.8;
    if (width >= 768) return base * 1.2;
    return base;
  },
  
  // Adaptive font size
  fontSize: (base, width) => {
    if (width < 360) return base * 0.9;
    if (width >= 768) return base * 1.1;
    return base;
  },
};

export default SharedStyles;
