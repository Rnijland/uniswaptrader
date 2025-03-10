// src/filters/LiquidityAnalysisFilter.js
const Filter = require('./Filter');

/**
 * Filter that analyzes liquidity metrics to identify trading opportunities
 */
class LiquidityAnalysisFilter extends Filter {
  constructor(parameters = {}) {
    super(
      'Liquidity Analysis', 
      'Detects favorable liquidity conditions for trading',
      {
        minimumLiquidity: parameters.minimumLiquidity || 50000, // Minimum USD liquidity
        liquidityGrowthThreshold: parameters.liquidityGrowthThreshold || 0.1, // 10% growth
        lookbackPeriod: parameters.lookbackPeriod || 72, // Hours
        imbalanceThreshold: parameters.imbalanceThreshold || 0.3, // 30% imbalance
        slippageThreshold: parameters.slippageThreshold || 0.02, // 2% slippage
        ...parameters
      }
    );
  }

  /**
   * Apply liquidity analysis to pool data
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Result with match status and additional data
   */
  apply(poolData) {
    try {
      // Check if current liquidity meets minimum requirements
      const currentLiquidity = this._getCurrentLiquidity(poolData);
      const hasMinimumLiquidity = currentLiquidity >= this.parameters.minimumLiquidity;
      
      // Check liquidity growth over time
      const liquidityGrowth = this._analyzeLiquidityGrowth(poolData);
      const hasSignificantGrowth = liquidityGrowth.growthRate >= this.parameters.liquidityGrowthThreshold;
      
      // Check for liquidity imbalance that could create opportunities
      const imbalanceAnalysis = this._analyzeLiquidityImbalance(poolData);
      const hasOpportunisticImbalance = imbalanceAnalysis.hasSignificantImbalance &&
        !imbalanceAnalysis.isCriticallyImbalanced;
      
      // Check slippage calculations for trade execution
      const slippageAnalysis = this._analyzeSlippage(poolData);
      const hasAcceptableSlippage = slippageAnalysis.estimatedSlippage <= this.parameters.slippageThreshold;
      
      // Determine if this is a match based on combined criteria
      const isMatch = hasMinimumLiquidity && 
        (hasSignificantGrowth || hasOpportunisticImbalance) && 
        hasAcceptableSlippage;
      
      // Return result
      return {
        isMatch,
        data: {
          currentLiquidity,
          liquidityGrowth,
          imbalanceAnalysis,
          slippageAnalysis,
          liquidityScore: this._calculateLiquidityScore({
            hasMinimumLiquidity,
            hasSignificantGrowth,
            hasOpportunisticImbalance,
            hasAcceptableSlippage,
            currentLiquidity,
            liquidityGrowth
          }),
          tradingRecommendation: this._generateRecommendation({
            hasMinimumLiquidity,
            hasSignificantGrowth,
            hasOpportunisticImbalance,
            hasAcceptableSlippage
          })
        }
      };
    } catch (error) {
      console.error(`Error applying LiquidityAnalysisFilter:`, error);
      return {
        isMatch: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get current liquidity in USD
   * @private
   * @param {Object} poolData - Pool data to analyze
   * @returns {number} Current liquidity in USD
   */
  _getCurrentLiquidity(poolData) {
    // For Uniswap V3, use the liquidity value if available
    if (poolData.liquidity && poolData.totalValueLockedUSD) {
      return parseFloat(poolData.totalValueLockedUSD);
    }
    
    // For Uniswap V2, calculate from reserves
    if (poolData.reserve0 && poolData.reserve1 && poolData.token0Price && poolData.token1Price) {
      const reserve0USD = parseFloat(poolData.reserve0) * parseFloat(poolData.token0Price);
      const reserve1USD = parseFloat(poolData.reserve1) * parseFloat(poolData.token1Price);
      return reserve0USD + reserve1USD;
    }
    
    // Default fallback
    return 0;
  }
  
  /**
   * Analyze liquidity growth over the lookback period
   * @private
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Liquidity growth analysis
   */
  _analyzeLiquidityGrowth(poolData) {
    if (!poolData.liquidityHistory || poolData.liquidityHistory.length < 2) {
      return {
        valid: false,
        reason: 'Insufficient liquidity history',
        growthRate: 0
      };
    }
    
    // Filter relevant history
    const relevantHistory = this._getRelevantHistory(poolData.liquidityHistory);
    
    if (relevantHistory.length < 2) {
      return {
        valid: false,
        reason: 'No liquidity data within lookback period',
        growthRate: 0
      };
    }
    
    // Calculate growth rate
    const startLiquidity = relevantHistory[0].liquidity;
    const endLiquidity = relevantHistory[relevantHistory.length - 1].liquidity;
    const growthRate = (endLiquidity - startLiquidity) / startLiquidity;
    
    // Calculate consistency of growth (steady vs. spiky)
    const growthConsistency = this._calculateGrowthConsistency(relevantHistory);
    
    return {
      valid: true,
      startLiquidity,
      endLiquidity,
      growthRate,
      growthConsistency,
      isConsistentGrowth: growthConsistency > 0.7
    };
  }
  
  /**
   * Analyze liquidity imbalance between token0 and token1
   * @private
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Imbalance analysis
   */
  _analyzeLiquidityImbalance(poolData) {
    // For Uniswap V2 pools
    if (poolData.reserve0 && poolData.reserve1 && poolData.token0Price && poolData.token1Price) {
      const reserve0USD = parseFloat(poolData.reserve0) * parseFloat(poolData.token0Price);
      const reserve1USD = parseFloat(poolData.reserve1) * parseFloat(poolData.token1Price);
      
      const totalLiquidityUSD = reserve0USD + reserve1USD;
      const token0Ratio = reserve0USD / totalLiquidityUSD;
      const token1Ratio = reserve1USD / totalLiquidityUSD;
      
      // Calculate imbalance as deviation from 50/50
      const imbalanceRatio = Math.abs(token0Ratio - 0.5) * 2;
      
      return {
        valid: true,
        token0Ratio,
        token1Ratio,
        imbalanceRatio,
        hasSignificantImbalance: imbalanceRatio >= this.parameters.imbalanceThreshold,
        isCriticallyImbalanced: imbalanceRatio >= 0.8, // 80% imbalance is critical
        favoredToken: token0Ratio > token1Ratio ? 'token1' : 'token0'
      };
    }
    
    // For Uniswap V3 pools - simplified approach
    // Real implementation would calculate based on concentrated liquidity ranges
    return {
      valid: false,
      reason: 'Imbalance calculation not implemented for this pool type',
      hasSignificantImbalance: false,
      isCriticallyImbalanced: false
    };
  }
  
  /**
   * Analyze expected slippage for a trade
   * @private
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Slippage analysis
   */
  _analyzeSlippage(poolData) {
    // Default trade size as 0.5% of pool liquidity
    const currentLiquidity = this._getCurrentLiquidity(poolData);
    const defaultTradeSize = currentLiquidity * 0.005;
    
    // Estimate slippage - this is a simplified model
    // Real implementation would use pool-specific math
    let estimatedSlippage;
    
    // For Uniswap V3
    if (poolData.liquidity && poolData.tick) {
      // Simplified V3 slippage model based on liquidity depth
      // Real implementation would use tick-based calculations
      estimatedSlippage = Math.pow(10, 12) / parseFloat(poolData.liquidity) * 0.01;
    } else {
      // For Uniswap V2
      if (poolData.reserve0 && poolData.reserve1) {
        const k = parseFloat(poolData.reserve0) * parseFloat(poolData.reserve1);
        const r0 = parseFloat(poolData.reserve0);
        
        // Simplified constant product formula
        const tradeSize = defaultTradeSize / parseFloat(poolData.token0Price);
        const newR0 = r0 + tradeSize;
        const newR1 = k / newR0;
        const oldR1 = parseFloat(poolData.reserve1);
        
        const expectedOutput = oldR1 - newR1;
        const idealOutput = tradeSize * parseFloat(poolData.token0Price) / parseFloat(poolData.token1Price);
        
        estimatedSlippage = 1 - (expectedOutput / idealOutput);
      } else {
        estimatedSlippage = 0.05; // Default fallback
      }
    }
    
    return {
      valid: true,
      estimatedTradeSize: defaultTradeSize,
      estimatedSlippage,
      maxAcceptableTradeSize: this._calculateMaxTradeSize(poolData),
      isLowSlippage: estimatedSlippage <= 0.01, // Less than 1%
      isMediumSlippage: estimatedSlippage > 0.01 && estimatedSlippage <= 0.03,
      isHighSlippage: estimatedSlippage > 0.03
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
   * Calculate the consistency of growth pattern
   * @private
   * @param {Array} liquidityHistory - Array of liquidity data points
   * @returns {number} Consistency score (0-1)
   */
  _calculateGrowthConsistency(liquidityHistory) {
    if (liquidityHistory.length < 3) {
      return 0.5; // Default for insufficient data
    }
    
    let consistentChanges = 0;
    let totalChanges = liquidityHistory.length - 1;
    let lastDirection = null;
    
    for (let i = 1; i < liquidityHistory.length; i++) {
      const currentDirection = 
        liquidityHistory[i].liquidity > liquidityHistory[i-1].liquidity ? 1 : -1;
      
      if (lastDirection === null) {
        lastDirection = currentDirection;
      } else if (lastDirection === currentDirection) {
        consistentChanges++;
      }
      
      lastDirection = currentDirection;
    }
    
    return consistentChanges / totalChanges;
  }
  
  /**
   * Calculate maximum trade size to stay within slippage threshold
   * @private
   * @param {Object} poolData - Pool data to analyze
   * @returns {number} Maximum trade size in USD
   */
  _calculateMaxTradeSize(poolData) {
    // This is a simplified estimation
    // Real implementation would use pool-specific math
    
    const currentLiquidity = this._getCurrentLiquidity(poolData);
    
    // For Uniswap V3
    if (poolData.liquidity) {
      // Simplified V3 calculation
      return currentLiquidity * 0.02; // 2% of liquidity
    }
    
    // For Uniswap V2
    if (poolData.reserve0 && poolData.reserve1) {
      // Simplified V2 calculation based on constant product formula
      // Maximum trade size to keep slippage under threshold
      const maxSlippage = this.parameters.slippageThreshold;
      const sqrtMaxSlippage = Math.sqrt(1 - maxSlippage);
      
      return currentLiquidity * (1 - sqrtMaxSlippage);
    }
    
    // Default fallback
    return currentLiquidity * 0.01; // 1% of liquidity
  }
  
  /**
   * Calculate a liquidity score (0-100) for ranking opportunities
   * @private
   * @param {Object} analysis - Analysis results
   * @returns {number} Liquidity score
   */
  _calculateLiquidityScore(analysis) {
    // Base score from minimum liquidity
    let score = 0;
    
    if (!analysis.hasMinimumLiquidity) {
      return score;
    }
    
    // Size score (0-40 points)
    const liquiditySize = Math.min(analysis.currentLiquidity / 1000000, 1);
    score += liquiditySize * 40;
    
    // Growth score (0-30 points)
    if (analysis.hasSignificantGrowth) {
      const growthScore = Math.min(analysis.liquidityGrowth.growthRate / 0.5, 1);
      score += growthScore * 30;
    }
    
    // Imbalance score (0-20 points)
    if (analysis.hasOpportunisticImbalance) {
      score += 20;
    }
    
    // Slippage score (0-10 points)
    if (analysis.hasAcceptableSlippage) {
      const slippageScore = 1 - (analysis.slippageAnalysis.estimatedSlippage / this.parameters.slippageThreshold);
      score += slippageScore * 10;
    }
    
    return score;
  }
  
  /**
   * Generate a trading recommendation based on liquidity analysis
   * @private
   * @param {Object} analysis - Analysis results
   * @returns {string} Trading recommendation
   */
  _generateRecommendation(analysis) {
    if (!analysis.hasMinimumLiquidity) {
      return "AVOID - Insufficient liquidity";
    }
    
    if (!analysis.hasAcceptableSlippage) {
      return "MONITOR - Slippage too high for efficient trading";
    }
    
    if (analysis.hasOpportunisticImbalance) {
      return `OPPORTUNITY - Liquidity imbalance favors trading ${analysis.imbalanceAnalysis?.favoredToken || 'token'}`;
    }
    
    if (analysis.hasSignificantGrowth) {
      return "FAVORABLE - Growing liquidity indicates increasing trading interest";
    }
    
    return "NEUTRAL - Sufficient liquidity but no strong signals";
  }
}

module.exports = LiquidityAnalysisFilter;