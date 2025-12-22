/**
 * OFFLINE SYNC MANAGER
 * 
 * Handles offline functionality and queue-based synchronization
 * - Detects network status
 * - Queues operations when offline
 * - Auto-syncs when connection restored
 * - Conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = 'offline_sync_queue';
const SYNC_STATUS_KEY = 'last_sync_status';

class OfflineSyncManager {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.syncInProgress = false;
    this.listeners = [];
    this.retryAttempts = {};
    this.maxRetries = 3;
  }
  
  // ==================== NETWORK MONITORING ====================
  
  /**
   * Initialize network monitoring
   */
  async initialize() {
    // Load existing queue
    await this.loadQueue();
    
    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // Notify listeners of network change
      this.notifyListeners({ online: this.isOnline });
      
      // Auto-sync when connection restored
      if (!wasOnline && this.isOnline) {
        this.syncAll();
      }
    });
    
    // Initial network check
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    
    return this.isOnline;
  }
  
  /**
   * Subscribe to network changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notifyListeners(event) {
    this.listeners.forEach(listener => listener(event));
  }
  
  // ==================== QUEUE MANAGEMENT ====================
  
  /**
   * Add operation to sync queue
   */
  async addToQueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      operation: operation.type,
      data: operation.data,
      url: operation.url,
      method: operation.method || 'POST',
      retries: 0,
      status: 'pending',
    };
    
    this.syncQueue.push(queueItem);
    await this.saveQueue();
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncAll();
    }
    
    return queueItem.id;
  }
  
  /**
   * Save queue to storage
   */
  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }
  
  /**
   * Load queue from storage
   */
  async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }
  
  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      total: this.syncQueue.length,
      pending: this.syncQueue.filter(i => i.status === 'pending').length,
      failed: this.syncQueue.filter(i => i.status === 'failed').length,
      syncing: this.syncInProgress,
    };
  }
  
  // ==================== SYNCHRONIZATION ====================
  
  /**
   * Sync all queued operations
   */
  async syncAll() {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, reason: this.syncInProgress ? 'sync_in_progress' : 'offline' };
    }
    
    this.syncInProgress = true;
    this.notifyListeners({ syncStarted: true });
    
    const results = {
      total: this.syncQueue.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };
    
    // Process queue items
    const itemsToSync = [...this.syncQueue];
    
    for (const item of itemsToSync) {
      if (item.status === 'pending' || (item.status === 'failed' && item.retries < this.maxRetries)) {
        try {
          await this.syncItem(item);
          
          // Remove from queue on success
          this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
          results.succeeded++;
          
        } catch (error) {
          item.retries++;
          item.status = 'failed';
          item.lastError = error.message;
          results.failed++;
          results.errors.push({
            id: item.id,
            operation: item.operation,
            error: error.message,
          });
          
          // Remove if max retries exceeded
          if (item.retries >= this.maxRetries) {
            this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
          }
        }
      }
    }
    
    await this.saveQueue();
    
    // Update sync status
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: results,
    }));
    
    this.syncInProgress = false;
    this.notifyListeners({ 
      syncCompleted: true, 
      results: results,
    });
    
    return results;
  }
  
  /**
   * Sync individual item
   */
  async syncItem(item) {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item.data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Clear sync queue
   */
  async clearQueue() {
    this.syncQueue = [];
    await this.saveQueue();
  }
  
  /**
   * Get last sync status
   */
  async getLastSyncStatus() {
    try {
      const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
  
  // ==================== CONFLICT RESOLUTION ====================
  
  /**
   * Resolve conflicts (server vs local data)
   */
  resolveConflict(serverData, localData, strategy = 'server_wins') {
    switch (strategy) {
      case 'server_wins':
        return serverData;
      
      case 'local_wins':
        return localData;
      
      case 'merge':
        return {
          ...serverData,
          ...localData,
          _merged: true,
          _mergedAt: new Date().toISOString(),
        };
      
      case 'newer_wins':
        const serverTime = new Date(serverData.timestamp || 0);
        const localTime = new Date(localData.timestamp || 0);
        return localTime > serverTime ? localData : serverData;
      
      default:
        return serverData;
    }
  }
  
  // ==================== UTILITIES ====================
  
  /**
   * Check if online
   */
  checkOnlineStatus() {
    return this.isOnline;
  }
  
  /**
   * Force sync
   */
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    return await this.syncAll();
  }
  
  /**
   * Get queue items
   */
  getQueueItems() {
    return [...this.syncQueue];
  }
  
  /**
   * Remove specific queue item
   */
  async removeQueueItem(id) {
    this.syncQueue = this.syncQueue.filter(i => i.id !== id);
    await this.saveQueue();
  }
}

// Singleton instance
const offlineSyncManager = new OfflineSyncManager();

export default offlineSyncManager;
