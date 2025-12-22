import React, {useState, useEffect, useCallback} from 'react';
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
  ActivityIndicator,
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import Barcode from 'react-native-barcode-builder';
import RNFS from 'react-native-fs';

// Import new services
import PerformanceOptimizer from '../services/PerformanceOptimizer';
import analyticsService from '../services/AnalyticsService';
import ToastService from '../services/ToastService';
import HapticFeedback from '../utils/HapticFeedback';

const EnrollScreen = ({ systemData, updateSystemData, logError }) => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('Student');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all, fingerprint, nfc, both, barcode, face
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState(null);
  
  useEffect(() => {
    analyticsService.trackScreenView('EnrollScreen');
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    PerformanceOptimizer.debounce((query) => {
      const filtered = systemData.enrolledUsers.filter(
        (user) =>
          user.userName.toLowerCase().includes(query.toLowerCase()) ||
          user.userId.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }, 300),
    [systemData.enrolledUsers]
  );

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (text) {
      debouncedSearch(text);
    } else {
      setFilteredUsers([]);
    }
  };
  
  const enrollWithFingerprint = async () => {
    HapticFeedback.light();
    
    if (!userName.trim() || !userId.trim()) {
      ToastService.warning('Please enter name and ID');
      Alert.alert('⚠️ Missing Info', 'Please enter both name and ID');
      return;
    }

    // Check if user exists (allow adding fingerprint to existing user)
    const existingIndex = systemData.enrolledUsers.findIndex(u => u.userId === userId);
    const existing = existingIndex >= 0 ? systemData.enrolledUsers[existingIndex] : null;
    
    if (existing && existing.hasFingerprint) {
      ToastService.warning('Already has fingerprint');
      Alert.alert('ℹ️ Already Has Fingerprint', `${existing.userName} already has fingerprint enrolled.`);
      return;
    }

    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

    try {
      const { available } = await rnBiometrics.isSensorAvailable();

      if (!available) {
        Alert.alert('❌ Not Available', 'Fingerprint sensor is not available');
        return;
      }

      Alert.alert(
        '👆 Read Fingerprint',
        `Ready to READ and SAVE fingerprint for:\n\n👤 ${userName}\n🆔 ${userId}\n📋 ${userRole}\n\nThis will REGISTER your fingerprint to this user.\n\nPlace your finger on the in-display scanner now.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Read Fingerprint',
            style: 'default',
            onPress: async () => {
              try {
                const { publicKey } = await rnBiometrics.createKeys();
                const { success } = await rnBiometrics.createSignature({
                  promptMessage: `Enroll fingerprint for ${userName}`,
                  payload: userId,
                });

                if (success) {
                  let updatedUsers;
                  
                  if (existing) {
                    // Add fingerprint to existing user
                    updatedUsers = [...systemData.enrolledUsers];
                    updatedUsers[existingIndex] = {
                      ...existing,
                      hasFingerprint: true,
                      fingerprintPublicKey: publicKey,
                      fingerprintEnrolledAt: new Date().toISOString(),
                      enrollmentType: existing.hasNFC ? 'both' : 'fingerprint',
                    };
                  } else {
                    // Create new user with fingerprint
                    const newUser = {
                      userId,
                      userName,
                      userRole,
                      hasFingerprint: true,
                      hasNFC: false,
                      fingerprintPublicKey: publicKey,
                      enrollmentType: 'fingerprint',
                      enrolledAt: new Date().toISOString(),
                      fingerprintEnrolledAt: new Date().toISOString(),
                    };
                    updatedUsers = [...systemData.enrolledUsers, newUser];
                  }
                  
                  await updateSystemData('enrolledUsers', updatedUsers);

                  const enrollmentStatus = existing 
                    ? `Added fingerprint to existing user\n${existing.hasNFC ? 'This user now has BOTH fingerprint AND NFC card' : ''}` 
                    : 'New user enrolled with fingerprint';
                  
                  Alert.alert(
                    '✅ Fingerprint Enrolled!',
                    `${userName}\n\n` +
                    `ID: ${userId}\n` +
                    `Role: ${userRole}\n` +
                    `Status: ${enrollmentStatus}\n\n` +
                    `${existing?.hasNFC ? '👆 Fingerprint + 📡 NFC Card' : '👆 Fingerprint Only'}`,
                    [{ 
                      text: 'Done',
                      onPress: () => {
                        if (!existing) {
                          setUserName('');
                          setUserId('');
                        }
                      }
                    }]
                  );
                } else {
                  Alert.alert('❌ Failed', 'Fingerprint enrollment failed');
                }
              } catch (error) {
                logError('FINGERPRINT', 'Enrollment failed', { error: error.message });
                Alert.alert('❌ Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      logError('FINGERPRINT', 'Sensor check failed', { error: error.message });
      Alert.alert('❌ Error', error.message);
    }
  };

  const enrollWithNFC = async () => {
    if (!userName.trim() || !userId.trim()) {
      Alert.alert('⚠️ Missing Info', 'Please enter both name and ID');
      return;
    }
    
    // Check NFC availability first
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        Alert.alert('❌ NFC Not Supported', 'Your device does not support NFC');
        return;
      }

      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        Alert.alert('⚠️ NFC Disabled', 'Please enable NFC in your device settings');
        return;
      }
    } catch (error) {
      Alert.alert('❌ NFC Error', 'Failed to check NFC status: ' + error.message);
      return;
    }
    
    // Check if user exists (allow adding NFC to existing user)
    const existingIndex = systemData.enrolledUsers.findIndex(u => u.userId === userId);
    const existing = existingIndex >= 0 ? systemData.enrolledUsers[existingIndex] : null;
    
    if (existing && existing.hasNFC) {
      Alert.alert('ℹ️ Already Has NFC', `${existing.userName} already has NFC card assigned.`);
      return;
    }

    try {
      Alert.alert(
        '📡 Read RFID Card',
        `Ready to READ and SAVE RFID card for:\n\n👤 ${userName}\n🆔 ${userId}\n📋 ${userRole}\n\nThis will REGISTER the card UID to this user.\n\nHold the RFID/NFC card to the BACK of your phone (near camera area) now.`,
        [
          { text: 'Cancel', onPress: () => NfcManager.cancelTechnologyRequest(), style: 'cancel' },
          {
            text: 'Read Card',
            style: 'default',
            onPress: async () => {
              try {
                await NfcManager.requestTechnology(NfcTech.Ndef);
                const tag = await NfcManager.getTag();

                let cardUid = '';
                if (tag && tag.id) {
                  cardUid = Array.from(tag.id)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join(':')
                    .toUpperCase();
                }

                let ndefData = '';
                if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                  try {
                    ndefData = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
                  } catch (err) {
                    ndefData = '';
                  }
                }

                await NfcManager.cancelTechnologyRequest();

                // Check if card already assigned to a DIFFERENT user
                const cardOwner = systemData.enrolledUsers.find(u => u.cardUid === cardUid && u.userId !== userId);
                if (cardOwner) {
                  Alert.alert(
                    '⚠️ Card Already Assigned',
                    `This card is already assigned to:\n\n${cardOwner.userName} (${cardOwner.userId})`
                  );
                  return;
                }

                let updatedUsers;
                
                if (existing) {
                  // Add NFC card to existing user
                  updatedUsers = [...systemData.enrolledUsers];
                  updatedUsers[existingIndex] = {
                    ...existing,
                    hasNFC: true,
                    cardUid,
                    cardType: tag.techTypes ? tag.techTypes.join(', ') : 'Unknown',
                    ndefData,
                    nfcEnrolledAt: new Date().toISOString(),
                    enrollmentType: existing.hasFingerprint ? 'both' : 'nfc',
                  };
                } else {
                  // Create new user with NFC
                  const newUser = {
                    userId,
                    userName,
                    userRole,
                    hasFingerprint: false,
                    hasNFC: true,
                    cardUid,
                    cardType: tag.techTypes ? tag.techTypes.join(', ') : 'Unknown',
                    ndefData,
                    enrollmentType: 'nfc',
                    enrolledAt: new Date().toISOString(),
                    nfcEnrolledAt: new Date().toISOString(),
                  };
                  updatedUsers = [...systemData.enrolledUsers, newUser];
                }
                
                await updateSystemData('enrolledUsers', updatedUsers);

                const enrollmentStatus = existing 
                  ? `Added NFC card to existing user\n${existing.hasFingerprint ? 'This user now has BOTH fingerprint AND NFC card' : ''}` 
                  : 'New user enrolled with NFC card';
                
                Alert.alert(
                  '✅ NFC Card Assigned!',
                  `${userName}\n\n` +
                  `Card UID: ${cardUid}\n` +
                  `User ID: ${userId}\n` +
                  `Role: ${userRole}\n` +
                  `Status: ${enrollmentStatus}\n\n` +
                  `${existing?.hasFingerprint ? '👆 Fingerprint + 📡 NFC Card' : '📡 NFC Card Only'}`,
                  [{ 
                    text: 'Done',
                    onPress: () => {
                      if (!existing) {
                        setUserName('');
                        setUserId('');
                      }
                    }
                  }]
                );

              } catch (scanError) {
                try {
                  await NfcManager.cancelTechnologyRequest();
                } catch (e) {
                  // Ignore cancel errors
                }
                logError('NFC', 'Card scan failed', { error: scanError.message });
                Alert.alert(
                  '❌ Scan Failed', 
                  `Failed to read NFC card.\n\nError: ${scanError.message}\n\nMake sure:\n• NFC is enabled\n• Card is close to phone back\n• Hold card steady for 2-3 seconds`
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      logError('NFC', 'NFC initialization failed', { error: error.message });
      Alert.alert('❌ Error', 'NFC initialization failed: ' + error.message);
    }
  };

  const generateBarcode = async () => {
    if (!userName.trim() || !userId.trim()) {
      Alert.alert('⚠️ Missing Info', 'Please enter both name and ID');
      return;
    }

    // Check if user exists
    const existingIndex = systemData.enrolledUsers.findIndex(u => u.userId === userId);
    const existing = existingIndex >= 0 ? systemData.enrolledUsers[existingIndex] : null;
    
    if (existing && existing.hasBarcode) {
      Alert.alert('ℹ️ Already Has Barcode', `${existing.userName} already has barcode generated.`);
      return;
    }

    // Generate unique barcode ID
    const barcodeId = `ATT${userId}${Date.now().toString(36).toUpperCase()}`;
    
    const newUser = {
      userId,
      userName: userName.trim(),
      userRole,
      hasBarcode: true,
      barcodeId: barcodeId,
      enrolledAt: new Date().toISOString(),
      barcodeGeneratedAt: new Date().toISOString(),
      ...(existing || {}),
      hasFingerprint: existing?.hasFingerprint || false,
      hasNFC: existing?.hasNFC || false,
      fingerprintPublicKey: existing?.fingerprintPublicKey || null,
      cardUid: existing?.cardUid || null,
      enrollmentType: existing
        ? existing.hasFingerprint && existing.hasNFC
          ? 'all'
          : existing.hasFingerprint
          ? 'fingerprint-barcode'
          : existing.hasNFC
          ? 'nfc-barcode'
          : 'barcode'
        : 'barcode',
    };

    let updatedUsers;
    if (existing) {
      updatedUsers = systemData.enrolledUsers.map(u =>
        u.userId === userId ? newUser : u
      );
    } else {
      updatedUsers = [...systemData.enrolledUsers, newUser];
    }

    await updateSystemData('enrolledUsers', updatedUsers);
    
    setCurrentBarcode({ user: newUser, barcodeId });
    setShowBarcodeModal(true);
    
    Alert.alert(
      '✅ Barcode Generated!',
      `Barcode created for ${userName}.\n\nBarcode ID: ${barcodeId}\n\nYou can screenshot or print this barcode for the ID card.`
    );
  };

  // ==================== FACE ENROLLMENT (ENTERPRISE SECURITY) ====================




  const deleteUser = (userId) => {
    Alert.alert(
      '⚠️ Confirm Delete',
      'Are you sure you want to remove this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedUsers = systemData.enrolledUsers.filter(u => u.userId !== userId);
            await updateSystemData('enrolledUsers', updatedUsers);
            Alert.alert('✅ Deleted', 'User has been removed');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerIcon}>🏫</Text>
          <Text style={styles.headerTitle}>Student Enrollment</Text>
          <Text style={styles.headerSubtitle}>Register fingerprints & RFID cards</Text>
        </View>
      </View>

      {/* Enrollment Form */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>➕ Enroll New User</Text>
        
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>User ID *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter unique ID"
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleButtons}>
          <TouchableOpacity 
            style={[styles.roleButton, userRole === 'Student' && styles.roleButtonActive]}
            onPress={() => setUserRole('Student')}>
            <Text style={styles.roleButtonText}>👨‍🎓 Student</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleButton, userRole === 'Teacher' && styles.roleButtonActive]}
            onPress={() => setUserRole('Teacher')}>
            <Text style={styles.roleButtonText}>👨‍🏫 Teacher</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleButton, userRole === 'Staff' && styles.roleButtonActive]}
            onPress={() => setUserRole('Staff')}>
            <Text style={styles.roleButtonText}>👔 Staff</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>👆 Choose Registration Method</Text>

        <TouchableOpacity 
          style={styles.modernEnrollButton}
          onPress={enrollWithFingerprint}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>👆</Text>
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>Register Fingerprint</Text>
            <Text style={styles.buttonSubtitle}>Scan & save biometric data</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modernNfcButton}
          onPress={enrollWithNFC}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>📱</Text>
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>Register RFID Card</Text>
            <Text style={styles.buttonSubtitle}>Tap card to save UID</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modernBarcodeButton}
          onPress={generateBarcode}>
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>📊</Text>
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonTitle}>Generate Barcode</Text>
            <Text style={styles.buttonSubtitle}>Create unique barcode ID</Text>
          </View>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>

      </View>

      {/* Enrolled Users List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Enrolled Users ({systemData.enrolledUsers.length})</Text>
        
        {/* Search and Filter */}
        {systemData.enrolledUsers.length > 0 && (
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}>
                <Text style={styles.filterButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'fingerprint' && styles.filterButtonActive]}
                onPress={() => setFilterType('fingerprint')}>
                <Text style={styles.filterButtonText}>👆</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'nfc' && styles.filterButtonActive]}
                onPress={() => setFilterType('nfc')}>
                <Text style={styles.filterButtonText}>📡</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'both' && styles.filterButtonActive]}
                onPress={() => setFilterType('both')}>
                <Text style={styles.filterButtonText}>Both</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'barcode' && styles.filterButtonActive]}
                onPress={() => setFilterType('barcode')}>
                <Text style={styles.filterButtonText}>📊</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {systemData.enrolledUsers.length > 0 ? (
          systemData.enrolledUsers
            .filter(user => {
              // Search filter
              const matchesSearch = searchQuery === '' || 
                user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.userId.toLowerCase().includes(searchQuery.toLowerCase());
              
              // Type filter
              const matchesType = filterType === 'all' || 
                (filterType === 'fingerprint' && user.hasFingerprint && !user.hasNFC && !user.hasBarcode && !user.hasFace) ||
                (filterType === 'nfc' && user.hasNFC && !user.hasFingerprint && !user.hasBarcode && !user.hasFace) ||
                (filterType === 'barcode' && user.hasBarcode) ||
                (filterType === 'face' && user.hasFace) ||
                (filterType === 'both' && ((user.hasFingerprint && user.hasNFC) || (user.hasFingerprint && user.hasBarcode) || (user.hasNFC && user.hasBarcode) || (user.hasFingerprint && user.hasFace) || (user.hasNFC && user.hasFace) || (user.hasBarcode && user.hasFace)));
              
              return matchesSearch && matchesType;
            })
            .map((user, index) => {
              // Build method icons
              const methodIcons = [];
              if (user.hasFingerprint) methodIcons.push('👆');
              if (user.hasNFC) methodIcons.push('📡');
              if (user.hasBarcode) methodIcons.push('📊');
              if (user.hasFace) methodIcons.push('👤');
              
              return (
                <View key={index} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userTypeIcon}>
                      {methodIcons.join('')}
                    </Text>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{user.userName}</Text>
                      <Text style={styles.userMeta}>
                        ID: {user.userId} | {user.userRole}
                      </Text>
                      <Text style={styles.userEnrollmentType}>
                        {methodIcons.length === 4 && '✅ All Methods (4)'}
                        {methodIcons.length === 3 && '✅ 3 Methods'}
                        {methodIcons.length === 2 && '✅ 2 Methods'}
                        {methodIcons.length === 1 && `✅ ${methodIcons[0]} Only`}
                      </Text>
                      {user.cardUid && (
                        <Text style={styles.userCardUid}>Card: {user.cardUid}</Text>
                      )}
                      {user.barcodeId && (
                        <Text style={styles.userCardUid}>Barcode: {user.barcodeId}</Text>
                      )}
                      {user.hasFace && (
                        <Text style={styles.userCardUid}>
                          Face: Enrolled 🔒 
                          {user.faceQualityScore && ` (${user.faceQualityScore}% quality)`}
                        </Text>
                      )}
                      <Text style={styles.userDate}>
                        Enrolled: {new Date(user.enrolledAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteUser(user.userId)}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              );
            })
        ) : (
          <Text style={styles.emptyText}>No users enrolled yet. Add your first user above!</Text>
        )}
      </View>

      {/* Barcode Display Modal */}
      <Modal
        visible={showBarcodeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBarcodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.barcodeModalContainer}>
            <Text style={styles.barcodeModalTitle}>📊 Barcode Generated</Text>
            
            {currentBarcode && (
              <View style={styles.barcodeDisplay}>
                <Text style={styles.barcodeUserName}>{currentBarcode.user.userName}</Text>
                <Text style={styles.barcodeUserId}>ID: {currentBarcode.user.userId}</Text>
                
                <View style={styles.barcodeWrapper}>
                  <Barcode
                    value={currentBarcode.barcodeId}
                    format="CODE128"
                    width={2}
                    height={80}
                    text={currentBarcode.barcodeId}
                    textStyle={styles.barcodeText}
                  />
                </View>
                
                <Text style={styles.barcodeInstructions}>
                  Screenshot this barcode and print it on the ID card.\n\nThis barcode can be scanned for attendance.
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowBarcodeModal(false)}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  formCard: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2d3748',
  },
  roleButtons: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  roleButtonActive: {
    backgroundColor: '#ebf4ff',
    borderColor: '#4299e1',
  },
  roleButtonText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#2d3748',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 16,
  },
  modernEnrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modernNfcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  buttonArrow: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userTypeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  userEnrollmentType: {
    fontSize: 12,
    color: '#38a169',
    fontWeight: '600',
    marginBottom: 4,
  },
  userCardUid: {
    fontSize: 11,
    color: '#4a5568',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 4,
  },
  deleteButton: {
    justifyContent: 'center',
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3748',
  },
  modernBarcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a855f7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  barcodeModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  barcodeModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  barcodeDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  barcodeUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  barcodeUserId: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
  },
  barcodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  barcodeText: {
    fontSize: 12,
    color: '#2d3748',
    marginTop: 8,
  },
  barcodeInstructions: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  closeModalButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EnrollScreen;
