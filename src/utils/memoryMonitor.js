/**
 * Memory & CPU Monitor
 * 
 * Features:
 * - Real-time memory usage tracking
 * - CPU usage monitoring
 * - Automatic garbage collection triggers
 * - Memory leak detection
 * - Performance alerts
 */

class MemoryMonitor {
  constructor() {
    this.memoryHistory = [];
    this.maxHistorySize = 60; // Keep last 60 readings (1 hour at 1min intervals)
    this.monitorInterval = null;
    this.isMonitoring = false;
    
    // Thresholds
    this.memoryWarningThreshold = parseInt(process.env.MEMORY_WARNING_THRESHOLD) || 400; // MB
    this.memoryCriticalThreshold = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || 500; // MB
    this.memoryGcThreshold = parseInt(process.env.MEMORY_GC_THRESHOLD) || 450; // MB
    
    // Stats
    this.stats = {
      peakMemory: 0,
      gcTriggers: 0,
      warnings: 0,
      criticals: 0,
      startTime: Date.now()
    };
  }

  /**
   * Start monitoring memory and CPU
   */
  startMonitoring(intervalMs = 60000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log(`[MEMORY MONITOR] Starting - checking every ${intervalMs/1000}s`);
    console.log(`[MEMORY MONITOR] Thresholds - Warning: ${this.memoryWarningThreshold}MB | Critical: ${this.memoryCriticalThreshold}MB | GC: ${this.memoryGcThreshold}MB`);
    
    // Initial reading
    this.recordMetrics();
    
    // Start periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.recordMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('[MEMORY MONITOR] Stopped');
  }

  /**
   * Record current memory and CPU metrics
   */
  recordMetrics() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);
    
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    const metric = {
      timestamp: Date.now(),
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      external: externalMB,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
      uptime: uptime
    };
    
    // Add to history
    this.memoryHistory.push(metric);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Update peak
    if (heapUsedMB > this.stats.peakMemory) {
      this.stats.peakMemory = heapUsedMB;
    }
    
    // Check thresholds
    this.checkThresholds(heapUsedMB);
    
    // Log current status
    const heapPercent = Math.round((heapUsedMB / heapTotalMB) * 100);
    console.log(`[MEMORY] Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%) | RSS: ${rssMB}MB | Peak: ${this.stats.peakMemory}MB`);
  }

  /**
   * Check memory thresholds and take action
   */
  checkThresholds(heapUsedMB) {
    // Critical threshold
    if (heapUsedMB >= this.memoryCriticalThreshold) {
      this.stats.criticals++;
      console.error(`[MEMORY CRITICAL] ${heapUsedMB}MB exceeds ${this.memoryCriticalThreshold}MB threshold!`);
      this.triggerGarbageCollection('critical');
      
      // Log to logger if available
      if (global.logger) {
        global.logger.logError('Memory', `Critical memory usage: ${heapUsedMB}MB`, null, { threshold: this.memoryCriticalThreshold });
      }
    }
    // Warning threshold
    else if (heapUsedMB >= this.memoryWarningThreshold) {
      this.stats.warnings++;
      console.warn(`[MEMORY WARNING] ${heapUsedMB}MB exceeds ${this.memoryWarningThreshold}MB threshold`);
      
      if (global.logger) {
        global.logger.logWarning('Memory', `High memory usage: ${heapUsedMB}MB`, `Threshold: ${this.memoryWarningThreshold}MB`);
      }
    }
    // GC threshold
    else if (heapUsedMB >= this.memoryGcThreshold) {
      this.triggerGarbageCollection('preventive');
    }
  }

  /**
   * Trigger garbage collection
   */
  triggerGarbageCollection(reason = 'manual') {
    if (global.gc) {
      const beforeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`[MEMORY GC] Triggering garbage collection (${reason})...`);
      
      global.gc();
      
      const afterMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const freedMB = beforeMB - afterMB;
      
      this.stats.gcTriggers++;
      console.log(`[MEMORY GC] Complete - Freed ${freedMB}MB (${beforeMB}MB → ${afterMB}MB)`);
    } else {
      console.warn('[MEMORY GC] Garbage collection not available (run with --expose-gc flag)');
    }
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const current = process.memoryUsage();
    const heapUsedMB = Math.round(current.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(current.heapTotal / 1024 / 1024);
    const rssMB = Math.round(current.rss / 1024 / 1024);
    
    const uptimeMs = Date.now() - this.stats.startTime;
    const uptimeHours = Math.round(uptimeMs / 1000 / 3600 * 10) / 10;
    
    return {
      current: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        rss: rssMB,
        heapPercent: Math.round((heapUsedMB / heapTotalMB) * 100)
      },
      history: this.memoryHistory,
      stats: {
        ...this.stats,
        uptime: `${uptimeHours}h`,
        avgMemory: this.getAverageMemory()
      },
      thresholds: {
        warning: this.memoryWarningThreshold,
        critical: this.memoryCriticalThreshold,
        gc: this.memoryGcThreshold
      }
    };
  }

  /**
   * Get average memory usage from history
   */
  getAverageMemory() {
    if (this.memoryHistory.length === 0) return 0;
    
    const sum = this.memoryHistory.reduce((acc, m) => acc + m.heapUsed, 0);
    return Math.round(sum / this.memoryHistory.length);
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeak() {
    if (this.memoryHistory.length < 10) {
      return { detected: false, message: 'Not enough data' };
    }
    
    // Get last 10 readings
    const recent = this.memoryHistory.slice(-10);
    
    // Check if memory is consistently increasing
    let increasingCount = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed > recent[i-1].heapUsed) {
        increasingCount++;
      }
    }
    
    // If memory increased in 8+ of last 10 readings, possible leak
    if (increasingCount >= 8) {
      const firstReading = recent[0].heapUsed;
      const lastReading = recent[recent.length - 1].heapUsed;
      const increase = lastReading - firstReading;
      const increasePercent = Math.round((increase / firstReading) * 100);
      
      return {
        detected: true,
        message: `Memory increased ${increase}MB (${increasePercent}%) over last 10 readings`,
        increase: increase,
        increasePercent: increasePercent
      };
    }
    
    return { detected: false, message: 'No leak detected' };
  }

  /**
   * Clean up old data to save memory
   */
  cleanup() {
    console.log('[MEMORY MONITOR] Running cleanup...');
    
    // Keep only last 30 history entries
    if (this.memoryHistory.length > 30) {
      this.memoryHistory = this.memoryHistory.slice(-30);
    }
    
    // Trigger GC if available
    this.triggerGarbageCollection('cleanup');
    
    console.log('[MEMORY MONITOR] Cleanup complete');
  }

  /**
   * Generate memory report
   */
  generateReport() {
    const stats = this.getStats();
    const leak = this.detectMemoryLeak();
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('[MEMORY MONITOR REPORT]');
    console.log('═'.repeat(80));
    console.log(`Current Usage: ${stats.current.heapUsed}MB / ${stats.current.heapTotal}MB (${stats.current.heapPercent}%)`);
    console.log(`RSS: ${stats.current.rss}MB`);
    console.log(`Peak Memory: ${stats.stats.peakMemory}MB`);
    console.log(`Average Memory: ${stats.stats.avgMemory}MB`);
    console.log(`Uptime: ${stats.stats.uptime}`);
    console.log(`GC Triggers: ${stats.stats.gcTriggers}`);
    console.log(`Warnings: ${stats.stats.warnings}`);
    console.log(`Criticals: ${stats.stats.criticals}`);
    console.log(`Leak Detection: ${leak.detected ? '⚠️  ' + leak.message : '✓ ' + leak.message}`);
    console.log('═'.repeat(80));
    
    return stats;
  }
}

export default new MemoryMonitor();
