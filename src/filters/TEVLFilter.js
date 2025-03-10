// src/filters/TEVLFilter.js
const Filter = require('./Filter');

/**
 * Filter that analyzes Time-Elapsed Value Loss (TEVL) patterns
 * TEVL represents the relationship between token price changes and time
 */
class TEVLFilter extends Filter {
  constructor(parameters = {}) {
    super(
      'TEVL Analysis', 
      'Detects favorable Time-Elapsed Value Loss patterns for trading',
      {
        lookbackPeriod: parameters.lookbackPeriod || 24, // Hours
        priceDropThreshold: parameters.priceDropThreshold || -0.1, // 10% drop
        recoveryThreshold: parameters.recoveryThreshold || 0.05, // 5% recovery
        volumeIncreaseThreshold: parameters.volumeIncreaseThreshold || 1.2, // 20% volume increase
        timeElapsedMinimum: parameters.timeElapsedMinimum || 4, // Hours
        timeElapsedMaximum: parameters.timeElapsedMaximum || 72, // Hours
        ...parameters
      }
    );
  }

  /**
   * Apply TEVL analysis to pool data
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Result with match status and additional data
   */
  apply(poolData) {
    try {
      // Check if we have the necessary historical data
      if (!poolData.priceHistory || !poolData.volumeHistory) {
        return {
          isMatch: false,
          data: {
            reason: 'Insufficient historical data for TEVL analysis'
          }
        };
      }
      
      // Analyze price pattern
      const pricePattern = this._analyzePricePattern(poolData.priceHistory);
      
      // Analyze volume pattern
      const volumePattern = this._analyzeVolumePattern(poolData.volumeHistory);
      
      // Check if the pattern matches TEVL criteria
      const isMatch = this._evaluatePattern(pricePattern, volumePattern);
      
      // Return result
      return {
        isMatch,
        data: {
          pricePattern,
          volumePattern,
          tevlScore: this._calculateTEVLScore(pricePattern, volumePattern),
          recommendedAction: isMatch ? 'BUY' : 'WAIT',
          targetPriceIncrease: this._calculateTargetPrice(poolData, pricePattern)
        }
      };
    } catch (error) {
      console.error(`Error applying TEVLFilter:`, error);
      return {
        isMatch: false,
        error: error.message
      };
    }
  }
  
  /**
   * Analyze price history to detect TEVL patterns
   * @private
   * @param {Array} priceHistory - Array of price data points
   * @returns {Object} Price pattern analysis
   */
  _analyzePricePattern(priceHistory) {
    // Filter to the lookback period
    const relevantHistory = this._getRelevantHistory(priceHistory);
    
    if (relevantHistory.length < 2) {
      return {
        valid: false,
        reason: 'Insufficient price history'
      };
    }
    
    // Find the largest drop in the period
    let largestDrop = 0;
    let largestDropIndex = -1;
    let initialPrice = relevantHistory[0].price;
    
    for (let i = 1; i < relevantHistory.length; i++) {
      const priceDrop = (relevantHistory[i].price - initialPrice) / initialPrice;
      if (priceDrop < largestDrop) {
        largestDrop = priceDrop;
        largestDropIndex = i;
      }
    }
    
    // If no significant drop was found
    if (largestDrop > this.parameters.priceDropThreshold) {
      return {
        valid: false,
        reason: 'No significant price drop detected',
        largestDrop
      };
    }
    
    // Analyze recovery after the drop
    let currentRecovery = 0;
    if (largestDropIndex < relevantHistory.length - 1) {
      const lowestPrice = relevantHistory[largestDropIndex].price;
      const currentPrice = relevantHistory[relevantHistory.length - 1].price;
      currentRecovery = (currentPrice - lowestPrice) / lowestPrice;
    }
    
    // Calculate time elapsed since the drop
    const dropTimestamp = relevantHistory[largestDropIndex].timestamp;
    const currentTimestamp = relevantHistory[relevantHistory.length - 1].timestamp;
    const hoursElapsed = (currentTimestamp - dropTimestamp) / (60 * 60 * 1000);
    
    return {
      valid: true,
      initialPrice,
      largestDrop,
      dropTimestamp,
      currentRecovery,
      hoursElapsed,
      isInRecoveryPhase: currentRecovery > 0,
      hasReachedRecoveryThreshold: currentRecovery >= this.parameters.recoveryThreshold,
      isWithinTimeWindow: 
        hoursElapsed >= this.parameters.timeElapsedMinimum && 
        hoursElapsed <= this.parameters.timeElapsedMaximum
    };
  }
  
  /**
   * Analyze volume history to detect TEVL patterns
   * @private
   * @param {Array} volumeHistory - Array of volume data points
   * @returns {Object} Volume pattern analysis
   */
  _analyzeVolumePattern(volumeHistory) {
    // Filter to the lookback period
    const relevantHistory = this._getRelevantHistory(volumeHistory);
    
    if (relevantHistory.length < 2) {
      return {
        valid: false,
        reason: 'Insufficient volume history'
      };
    }
    
    // Calculate average volume before the drop
    const halfwayPoint = Math.floor(relevantHistory.length / 2);
    const beforeVolumes = relevantHistory.slice(0, halfwayPoint);
    const afterVolumes = relevantHistory.slice(halfwayPoint);
    
    const beforeAvg = this._calculateAverage(beforeVolumes.map(v => v.volume));
    const afterAvg = this._calculateAverage(afterVolumes.map(v => v.volume));
    
    // Calculate volume increase ratio
    const volumeIncreaseRatio = afterAvg / beforeAvg;
    
    return {
      valid: true,
      beforeAverageVolume: beforeAvg,
      afterAverageVolume: afterAvg,
      volumeIncreaseRatio,
      hasSignificantVolumeIncrease: volumeIncreaseRatio >= this.parameters.volumeIncreaseThreshold
    };
  }
  
  /**
   * Get relevant history within the lookback period
   * @private
   * @param {Array} history - Array of historical data points
   * @returns {Array} Filtered history
   */
  _getRelevantHistory(history) {
    const now = Date.now();
    const lookbackTime = now - (this.parameters.lookbackPeriod * 60 * 60 * 1000);
    
    return history.filter(point => point.timestamp >= lookbackTime);
  }
  
  /**
   * Calculate average of an array of values
   * @private
   * @param {Array} values - Array of numeric values
   * @returns {number} Average value
   */
  _calculateAverage(values) {
    if (!values.length) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Evaluate if the pattern matches TEVL criteria for a trading opportunity
   * @private
   * @param {Object} pricePattern - Price pattern analysis
   * @param {Object} volumePattern - Volume pattern analysis
   * @returns {boolean} Whether pattern matches criteria
   */
  _evaluatePattern(pricePattern, volumePattern) {
    // Both analyses must be valid
    if (!pricePattern.valid || !volumePattern.valid) {
      return false;
    }
    
    // Check TEVL criteria
    return (
      // Price dropped significantly
      pricePattern.largestDrop <= this.parameters.priceDropThreshold &&
      // Recovery has started but not completed
      pricePattern.isInRecoveryPhase &&
      pricePattern.currentRecovery < Math.abs(pricePattern.largestDrop) * 0.9 &&
      // Time window is appropriate
      pricePattern.isWithinTimeWindow &&
      // Volume has increased significantly
      volumePattern.hasSignificantVolumeIncrease
    );
  }
  
  /**
   * Calculate a TEVL score (0-100) to rank opportunities
   * @private
   * @param {Object} pricePattern - Price pattern analysis
   * @param {Object} volumePattern - Volume pattern analysis
   * @returns {number} TEVL score
   */
  _calculateTEVLScore(pricePattern, volumePattern) {
    if (!pricePattern.valid || !volumePattern.valid) {
      return 0;
    }
    
    // Score components (0-100 each)
    const dropScore = Math.min(Math.abs(pricePattern.largestDrop) * 200, 100);
    const recoveryScore = Math.min(pricePattern.currentRecovery * 500, 100);
    const timeScore = 100 - Math.min(
      Math.abs(pricePattern.hoursElapsed - 24) * 4, 
      100
    );
    const volumeScore = Math.min(volumePattern.volumeIncreaseRatio * 50, 100);
    
    // Weighted average
    return (
      (dropScore * 0.3) +
      (recoveryScore * 0.3) +
      (timeScore * 0.2) +
      (volumeScore * 0.2)
    );
  }
  
  /**
   * Calculate a target price based on the TEVL pattern
   * @private
   * @param {Object} poolData - Pool data
   * @param {Object} pricePattern - Price pattern analysis
   * @returns {number} Target price for taking profit
   */
  _calculateTargetPrice(poolData, pricePattern) {
    if (!pricePattern.valid) {
      return 0;
    }
    
    // Get current price
    const currentPrice = poolData.priceHistory[poolData.priceHistory.length - 1].price;
    
    // Target a 50% recovery of the total drop
    const totalDrop = Math.abs(pricePattern.largestDrop);
    const targetRecovery = totalDrop * 0.5;
    
    // Calculate price at lowest point
    const lowestPrice = pricePattern.initialPrice * (1 + pricePattern.largestDrop);
    
    // Calculate target price (from lowest point)
    return lowestPrice * (1 + targetRecovery);
  }
}

module.exports = TEVLFilter;