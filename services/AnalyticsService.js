/**
 * Analytics Service
 * 
 * Tracks usage statistics, performance metrics, and user behavior
 * Provides insights for improving the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_KEY = 'analytics_data';
const PERFORMANCE_KEY = 'performance_metrics';

class AnalyticsService {
  constructor() {
    this.sessionStart = Date.now();
    this.events = [];
  }

  /**
   * Initialize analytics
   */
  async init() {
    await this.loadAnalyticsData();
    console.log('Analytics initialized');
  }

  /**
   * Load analytics data from storage
   */
  async loadAnalyticsData() {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_KEY);
      if (data) {
        this.events = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  /**
   * Save analytics data to storage
   */
  async saveAnalyticsData() {
    try {
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }

  /**
   * Track an event
   * @param {string} category - Event category (e.g., 'attendance', 'enrollment')
   * @param {string} action - Event action (e.g., 'record', 'scan')
   * @param {string} label - Event label (e.g., 'fingerprint', 'nfc')
   * @param {number} value - Optional numeric value
   */
  async trackEvent(category, action, label, value = null) {
    const event = {
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.sessionStart,
    };

    this.events.push(event);
    await this.saveAnalyticsData();

    console.log('[Analytics]', event);
  }

  /**
   * Track attendance recording
   */
  async trackAttendance(method, success = true) {
    await this.trackEvent('attendance', 'record', method, success ? 1 : 0);
  }

  /**
   * Track user enrollment
   */
  async trackEnrollment(method, success = true) {
    await this.trackEvent('enrollment', 'enroll', method, success ? 1 : 0);
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName) {
    await this.trackEvent('navigation', 'screen_view', screenName);
  }

  /**
   * Track error
   */
  async trackError(errorType, errorMessage, context = '') {
    await this.trackEvent('error', errorType, errorMessage + ' | ' + context, 0);
  }

  /**
   * Track performance metric
   */
  async trackPerformance(metricName, durationMs) {
    await this.trackEvent('performance', 'measure', metricName, durationMs);
    
    // Also save to performance metrics
    await this.savePerformanceMetric(metricName, durationMs);
  }

  /**
   * Save performance metric separately
   */
  async savePerformanceMetric(name, duration) {
    try {
      const metricsData = await AsyncStorage.getItem(PERFORMANCE_KEY);
      const metrics = metricsData ? JSON.parse(metricsData) : {};

      if (!metrics[name]) {
        metrics[name] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: duration,
          maxDuration: duration,
          samples: [],
        };
      }

      const metric = metrics[name];
      metric.count++;
      metric.totalDuration += duration;
      metric.avgDuration = metric.totalDuration / metric.count;
      metric.minDuration = Math.min(metric.minDuration, duration);
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      
      // Keep last 100 samples
      metric.samples.push({ duration, timestamp: new Date().toISOString() });
      if (metric.samples.length > 100) {
        metric.samples.shift();
      }

      await AsyncStorage.setItem(PERFORMANCE_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to save performance metric:', error);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    const stats = {
      totalEvents: this.events.length,
      byCategory: {},
      byAction: {},
      byLabel: {},
      timeRange: {
        first: this.events[0]?.timestamp,
        last: this.events[this.events.length - 1]?.timestamp,
      },
    };

    for (const event of this.events) {
      // By category
      if (!stats.byCategory[event.category]) {
        stats.byCategory[event.category] = 0;
      }
      stats.byCategory[event.category]++;

      // By action
      const actionKey = `${event.category}.${event.action}`;
      if (!stats.byAction[actionKey]) {
        stats.byAction[actionKey] = 0;
      }
      stats.byAction[actionKey]++;

      // By label
      if (event.label) {
        if (!stats.byLabel[event.label]) {
          stats.byLabel[event.label] = 0;
        }
        stats.byLabel[event.label]++;
      }
    }

    return stats;
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats() {
    const attendanceEvents = this.events.filter(e => e.category === 'attendance');
    
    const stats = {
      total: attendanceEvents.length,
      successful: attendanceEvents.filter(e => e.value === 1).length,
      failed: attendanceEvents.filter(e => e.value === 0).length,
      byMethod: {},
      last24Hours: 0,
      last7Days: 0,
      last30Days: 0,
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    for (const event of attendanceEvents) {
      // By method
      if (!stats.byMethod[event.label]) {
        stats.byMethod[event.label] = { total: 0, successful: 0, failed: 0 };
      }
      stats.byMethod[event.label].total++;
      if (event.value === 1) {
        stats.byMethod[event.label].successful++;
      } else {
        stats.byMethod[event.label].failed++;
      }

      // Time ranges
      const eventTime = new Date(event.timestamp).getTime();
      if (now - eventTime < day) stats.last24Hours++;
      if (now - eventTime < 7 * day) stats.last7Days++;
      if (now - eventTime < 30 * day) stats.last30Days++;
    }

    return stats;
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats() {
    const enrollmentEvents = this.events.filter(e => e.category === 'enrollment');
    
    const stats = {
      total: enrollmentEvents.length,
      successful: enrollmentEvents.filter(e => e.value === 1).length,
      failed: enrollmentEvents.filter(e => e.value === 0).length,
      byMethod: {},
    };

    for (const event of enrollmentEvents) {
      if (!stats.byMethod[event.label]) {
        stats.byMethod[event.label] = { total: 0, successful: 0, failed: 0 };
      }
      stats.byMethod[event.label].total++;
      if (event.value === 1) {
        stats.byMethod[event.label].successful++;
      } else {
        stats.byMethod[event.label].failed++;
      }
    }

    return stats;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const metricsData = await AsyncStorage.getItem(PERFORMANCE_KEY);
      return metricsData ? JSON.parse(metricsData) : {};
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }

  /**
   * Get most used methods
   */
  async getMostUsedMethods(limit = 5) {
    const attendanceEvents = this.events.filter(e => e.category === 'attendance');
    const methodCounts = {};

    for (const event of attendanceEvents) {
      if (!methodCounts[event.label]) {
        methodCounts[event.label] = 0;
      }
      methodCounts[event.label]++;
    }

    const sorted = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([method, count]) => ({ method, count }));

    return sorted;
  }

  /**
   * Get daily attendance breakdown
   */
  async getDailyBreakdown(days = 7) {
    const attendanceEvents = this.events.filter(e => e.category === 'attendance');
    const breakdown = {};

    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      breakdown[dateStr] = 0;
    }

    for (const event of attendanceEvents) {
      const dateStr = event.timestamp.split('T')[0];
      if (breakdown.hasOwnProperty(dateStr)) {
        breakdown[dateStr]++;
      }
    }

    return Object.entries(breakdown)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * Get peak usage hours
   */
  async getPeakHours() {
    const attendanceEvents = this.events.filter(e => e.category === 'attendance');
    const hourCounts = Array(24).fill(0);

    for (const event of attendanceEvents) {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    }

    const hourData = hourCounts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }));

    return hourData.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  /**
   * Clear all analytics data
   */
  async clearAllData() {
    this.events = [];
    await AsyncStorage.removeItem(ANALYTICS_KEY);
    await AsyncStorage.removeItem(PERFORMANCE_KEY);
    console.log('Analytics data cleared');
  }

  /**
   * Export analytics data as JSON
   */
  async exportData() {
    const usageStats = await this.getUsageStats();
    const attendanceStats = await this.getAttendanceStats();
    const enrollmentStats = await this.getEnrollmentStats();
    const performanceMetrics = await this.getPerformanceMetrics();
    const mostUsedMethods = await this.getMostUsedMethods();
    const dailyBreakdown = await this.getDailyBreakdown(30);
    const peakHours = await this.getPeakHours();

    return {
      generatedAt: new Date().toISOString(),
      usage: usageStats,
      attendance: attendanceStats,
      enrollment: enrollmentStats,
      performance: performanceMetrics,
      insights: {
        mostUsedMethods,
        dailyBreakdown,
        peakHours,
      },
      rawEvents: this.events,
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;

/**
 * USAGE EXAMPLES:
 * 
 * // Initialize in App.js
 * import analyticsService from './services/AnalyticsService';
 * 
 * useEffect(() => {
 *   analyticsService.init();
 * }, []);
 * 
 * // Track attendance
 * await analyticsService.trackAttendance('fingerprint', true);
 * 
 * // Track enrollment
 * await analyticsService.trackEnrollment('face', true);
 * 
 * // Track screen view
 * await analyticsService.trackScreenView('HomeScreen');
 * 
 * // Track error
 * await analyticsService.trackError('api_error', 'Failed to sync', 'AttendanceScreen');
 * 
 * // Track performance
 * const start = Date.now();
 * await doSomething();
 * await analyticsService.trackPerformance('face_recognition', Date.now() - start);
 * 
 * // Get statistics
 * const stats = await analyticsService.getAttendanceStats();
 * console.log('Total attendance:', stats.total);
 * console.log('By method:', stats.byMethod);
 * 
 * // Export data
 * const data = await analyticsService.exportData();
 * console.log('Analytics data:', data);
 */
