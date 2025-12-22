import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';

// Import new services
import offlineSyncManager from '../services/OfflineSyncManager';
import analyticsService from '../services/AnalyticsService';
import PerformanceOptimizer from '../services/PerformanceOptimizer';
import ToastService from '../services/ToastService';
import HapticFeedback from '../utils/HapticFeedback';

const DiagnosticsScreen = ({ systemData, updateSystemData }) => {
  const [queueStatus, setQueueStatus] = useState({ total: 0, pending: 0, failed: 0, syncing: false });
  const [analytics, setAnalytics] = useState(null);
  const [performance, setPerformance] = useState({});

  useEffect(() => {
    analyticsService.trackScreenView('DiagnosticsScreen');
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      // Sync queue status
      const queue = offlineSyncManager.getQueueStatus();
      setQueueStatus(queue);

      // Analytics data
      const stats = await analyticsService.getAttendanceStats();
      setAnalytics(stats);

      // Performance metrics
      const perf = await analyticsService.getPerformanceMetrics();
      setPerformance(perf);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    }
  };

  const handleForceSync = async () => {
    HapticFeedback.medium();
    ToastService.info('Starting sync...');
    
    try {
      await offlineSyncManager.forceSync();
      ToastService.success('Sync completed!');
      loadDiagnostics();
    } catch (error) {
      ToastService.error(`Sync failed: ${error.message}`);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await PerformanceOptimizer.clearCache();
            HapticFeedback.success();
            ToastService.success('Cache cleared');
          },
        },
      ]
    );
  };
  
  const copyError = async (error) => {
    const errorText = `ERROR LOG\n\nType: ${error.type}\nMessage: ${error.message}\nTime: ${new Date(error.timestamp).toLocaleString()}\nDetails: ${JSON.stringify(error.details, null, 2)}\nStack: ${error.stack || 'N/A'}`;
    
    try {
      await Share.share({
        message: errorText,
        title: 'Error Log'
      });
    } catch (err) {
      Alert.alert('❌ Share Failed', err.message);
    }
  };

  const clearErrorLogs = () => {
    Alert.alert(
      '⚠️ Confirm Clear',
      'Are you sure you want to clear all error logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await updateSystemData('errorLogs', []);
            Alert.alert('✅ Cleared', 'Error logs have been cleared');
          }
        }
      ]
    );
  };

  const resetAllData = () => {
    Alert.alert(
      '🚨 RESET ALL DATA',
      'This will DELETE all enrolled users, attendance history, error logs, and statistics. This action cannot be undone!\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET EVERYTHING',
          style: 'destructive',
          onPress: async () => {
            await updateSystemData('enrolledUsers', []);
            await updateSystemData('attendanceHistory', []);
            await updateSystemData('errorLogs', []);
            await updateSystemData('systemStats', {
              totalScans: 0,
              successfulScans: 0,
              failedScans: 0,
              lastSyncTime: null,
            });
            Alert.alert('✅ Reset Complete', 'All data has been cleared');
          }
        }
      ]
    );
  };

  const { errorLogs, systemStats } = systemData;
  const successRate = systemStats.totalScans > 0 
    ? ((systemStats.successfulScans / systemStats.totalScans) * 100).toFixed(1)
    : 0;

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerEmoji}>🛠️</Text>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <Text style={styles.headerSubtitle}>Error Logs & Statistics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
      
      {/* Sync Queue Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔄 Sync Queue Status</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total in Queue:</Text>
          <Text style={styles.statValue}>{queueStatus.total || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Pending:</Text>
          <Text style={[styles.statValue, styles.statWarning]}>
            {queueStatus.pending || 0}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Failed:</Text>
          <Text style={[styles.statValue, styles.statFailed]}>
            {queueStatus.failed || 0}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Status:</Text>
          <Text style={styles.statValue}>
            {queueStatus.syncing ? '🔄 Syncing...' : '✅ Idle'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleForceSync}>
          <Text style={styles.buttonText}>🔄 Force Sync Now</Text>
        </TouchableOpacity>
      </View>

      {/* Analytics Statistics */}
      {analytics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Attendance Analytics</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Records:</Text>
            <Text style={styles.statValue}>{analytics.total}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Successful:</Text>
            <Text style={[styles.statValue, styles.statSuccess]}>
              {analytics.successful}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Failed:</Text>
            <Text style={[styles.statValue, styles.statFailed]}>
              {analytics.failed}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last 24 Hours:</Text>
            <Text style={styles.statValue}>{analytics.last24Hours}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last 7 Days:</Text>
            <Text style={styles.statValue}>{analytics.last7Days}</Text>
          </View>
          
          {analytics.byMethod && Object.keys(analytics.byMethod).length > 0 && (
            <>
              <Text style={[styles.statLabel, { marginTop: 12, marginBottom: 8 }]}>
                By Method:
              </Text>
              {Object.entries(analytics.byMethod).map(([method, data]) => (
                <View key={method} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {method === 'fingerprint' ? '👆' : 
                     method === 'nfc' ? '📡' : 
                     method === 'barcode' ? '📊' : '👤'} {method}:
                  </Text>
                  <Text style={styles.statValue}>{data.total}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Performance Metrics */}
      {Object.keys(performance).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Performance Metrics</Text>
          
          {Object.entries(performance).map(([metric, data]) => (
            <View key={metric} style={styles.statRow}>
              <Text style={styles.statLabel}>{metric}:</Text>
              <Text style={styles.statValue}>
                {data.avgDuration?.toFixed(0)}ms avg
              </Text>
            </View>
          ))}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.warningButton]}
            onPress={handleClearCache}>
            <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* System Statistics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 System Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Scans:</Text>
          <Text style={styles.statValue}>{systemStats.totalScans}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Successful:</Text>
          <Text style={[styles.statValue, styles.statSuccess]}>
            {systemStats.successfulScans}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Failed:</Text>
          <Text style={[styles.statValue, styles.statFailed]}>
            {systemStats.failedScans}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Success Rate:</Text>
          <Text style={styles.statValue}>{successRate}%</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Last Sync:</Text>
          <Text style={styles.statValueSmall}>
            {systemStats.lastSyncTime 
              ? new Date(systemStats.lastSyncTime).toLocaleString()
              : 'Never'}
          </Text>
        </View>
      </View>

      {/* Advanced Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔬 Advanced Diagnostics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Platform:</Text>
          <Text style={styles.statValue}>{Platform.OS.toUpperCase()}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>API Level:</Text>
          <Text style={styles.statValue}>{Platform.Version}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Device Model:</Text>
          <Text style={styles.statValue}>Nothing Phone 2</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>App Version:</Text>
          <Text style={styles.statValue}>2.0.0</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Build:</Text>
          <Text style={styles.statValue}>20251219</Text>
        </View>
      </View>

      {/* Error Logs */}
      <View style={styles.card}>
        <View style={styles.errorHeader}>
          <Text style={styles.cardTitle}>🐛 Error Logs ({errorLogs.length})</Text>
          {errorLogs.length > 0 && (
            <TouchableOpacity style={styles.miniClearButton} onPress={clearErrorLogs}>
              <Text style={styles.miniClearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.errorScroll} nestedScrollEnabled={true}>
          {errorLogs.length > 0 ? (
            errorLogs.slice(0, 30).map((log, index) => (
              <View key={log.id || index} style={styles.errorCard}>
                <View style={styles.errorCardHeader}>
                  <Text style={styles.errorType}>[{log.type}]</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyError(log)}>
                    <Text style={styles.copyButtonText}>📋 Copy</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.errorTime}>
                  {new Date(log.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.errorMessage}>{log.message}</Text>
                {log.details && Object.keys(log.details).length > 0 && (
                  <View style={styles.errorDetailsBox}>
                    <Text style={styles.errorDetailsText}>
                      {JSON.stringify(log.details, null, 2)}
                    </Text>
                  </View>
                )}
                <Text style={styles.errorPlatform}>
                  Platform: {log.platform} {log.version || ''}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No errors logged</Text>
              <Text style={styles.emptySubtext}>System is running smoothly!</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
        <Text style={styles.dangerText}>
          These actions are permanent and cannot be undone!
        </Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={clearErrorLogs}>
          <Text style={styles.dangerButtonText}>🗑️ Clear Error Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetAllData}>
          <Text style={styles.resetButtonText}>🚨 RESET ALL DATA</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ About Error Logs</Text>
        <Text style={styles.infoText}>
          Error logs help diagnose issues with:{'\n'}
          • Network connectivity{'\n'}
          • NFC operations{'\n'}
          • Fingerprint scanning{'\n'}
          • Server synchronization{'\n'}
          • Data storage{'\n'}
          {'\n'}
          Logs are kept for the last 100 errors.
        </Text>
      </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernHeader: {
    backgroundColor: '#1e293b',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    opacity: 0.9,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: 'bold',
  },
  statSuccess: {
    color: '#38a169',
  },
  statFailed: {
    color: '#e53e3e',
  },
  statValueSmall: {
    fontSize: 11,
    color: '#1a202c',
    fontWeight: '600',
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniClearButton: {
    backgroundColor: '#e53e3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniClearText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorScroll: {
    maxHeight: 400,
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
  },
  errorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#c53030',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#4299e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  errorTime: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#2d3748',
    marginBottom: 8,
    fontWeight: '500',
  },
  errorDetailsBox: {
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 11,
    color: '#4a5568',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorPlatform: {
    fontSize: 10,
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#a0aec0',
  },
  dangerCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#feb2b2',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c53030',
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 13,
    color: '#742a2a',
    marginBottom: 16,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#991b1b',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
});

export default DiagnosticsScreen;
