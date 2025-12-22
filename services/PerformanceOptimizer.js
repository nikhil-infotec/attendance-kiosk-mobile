/**
 * PERFORMANCE OPTIMIZER
 * 
 * Improves app speed and responsiveness through:
 * - Image caching
 * - Data memoization
 * - Render optimization
 * - Background task management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';

class PerformanceOptimizer {
  
  // ==================== RENDER OPTIMIZATION ====================
  
  /**
   * Delays non-critical tasks until animations complete
   * Prevents jank during screen transitions
   */
  static runAfterInteractions(callback) {
    return InteractionManager.runAfterInteractions(() => {
      callback();
    });
  }
  
  /**
   * Debounce function calls to prevent excessive re-renders
   * Useful for search inputs, filters, etc.
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Throttle function calls to limit execution frequency
   * Useful for scroll events, resize handlers
   */
  static throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // ==================== DATA CACHING ====================
  
  /**
   * Cache data with expiration
   * Reduces unnecessary API calls
   */
  static async cacheData(key, data, expirationMinutes = 60) {
    const cacheItem = {
      data: data,
      timestamp: Date.now(),
      expiration: expirationMinutes * 60 * 1000,
    };
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
  }
  
  /**
   * Retrieve cached data if not expired
   */
  static async getCachedData(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;
      
      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      
      if (now - cacheItem.timestamp > cacheItem.expiration) {
        // Cache expired
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return cacheItem.data;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clear all cached data
   */
  static async clearCache() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  }
  
  // ==================== MEMORY MANAGEMENT ====================
  
  /**
   * Batch operations to reduce memory pressure
   * Processes large arrays in chunks
   */
  static async batchProcess(items, batchSize, processor) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return results;
  }
  
  /**
   * Lazy load data on demand
   * Useful for long lists
   */
  static createLazyLoader(data, pageSize = 20) {
    let currentPage = 0;
    
    return {
      loadMore: () => {
        const start = currentPage * pageSize;
        const end = start + pageSize;
        const page = data.slice(start, end);
        currentPage++;
        return {
          data: page,
          hasMore: end < data.length,
          total: data.length,
        };
      },
      reset: () => {
        currentPage = 0;
      },
    };
  }
  
  // ==================== IMAGE OPTIMIZATION ====================
  
  /**
   * Compress image before storage
   */
  static async compressImage(uri, quality = 0.8) {
    // Placeholder for image compression
    // Would use react-native-image-resizer or similar
    return uri;
  }
  
  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(uri, size = 100) {
    // Placeholder for thumbnail generation
    return uri;
  }
  
  // ==================== NETWORK OPTIMIZATION ====================
  
  /**
   * Retry failed requests with exponential backoff
   */
  static async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Batch multiple API requests
   */
  static createRequestBatcher(apiCall, batchSize = 10, delay = 500) {
    let queue = [];
    let timeout = null;
    
    const processBatch = async () => {
      if (queue.length === 0) return;
      
      const batch = queue.splice(0, batchSize);
      const promises = batch.map(item => apiCall(item.data));
      
      try {
        const results = await Promise.all(promises);
        batch.forEach((item, index) => {
          item.resolve(results[index]);
        });
      } catch (error) {
        batch.forEach(item => item.reject(error));
      }
      
      if (queue.length > 0) {
        timeout = setTimeout(processBatch, delay);
      }
    };
    
    return (data) => {
      return new Promise((resolve, reject) => {
        queue.push({ data, resolve, reject });
        
        if (!timeout) {
          timeout = setTimeout(processBatch, delay);
        }
      });
    };
  }
  
  // ==================== ANALYTICS ====================
  
  /**
   * Track performance metrics
   */
  static trackPerformance(name, duration) {
    console.log(`[Performance] ${name}: ${duration}ms`);
    // Could send to analytics service
  }
  
  /**
   * Measure execution time
   */
  static async measureAsync(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.trackPerformance(name, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.trackPerformance(`${name} (failed)`, duration);
      throw error;
    }
  }
  
  // ==================== GARBAGE COLLECTION ====================
  
  /**
   * Clean up old data to free memory
   */
  static async cleanupOldData(daysToKeep = 30) {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      // Clean old cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.timestamp < cutoffDate) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return false;
    }
  }
}

export default PerformanceOptimizer;
