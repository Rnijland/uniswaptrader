// src/controllers/filterController.js
const FilterRegistry = require('../filters/FilterRegistry');
const FilterManager = require('../filters/FilterManager');
const { PoolDataService } = require('../exchanges/poolDataService');

// Create a singleton instance of FilterManager
const filterManager = new FilterManager();

// Pool Data Service for fetching data
const poolDataService = new PoolDataService();

// Add getPoolData method to handle both V3 and V2 pools
poolDataService.getPoolData = async function(poolAddress) {
  try {
    // Try to get V3 pool data first
    try {
      const v3Data = await this.getV3PoolData(poolAddress);
      return v3Data;
    } catch (v3Error) {
      // If V3 fails, try V2
      try {
        const v2Data = await this.getV2PoolData(poolAddress);
        return v2Data;
      } catch (v2Error) {
        // If both fail, throw an error
        throw new Error(`Could not get data for pool ${poolAddress} (tried both V3 and V2)`);
      }
    }
  } catch (error) {
    console.error(`Error getting pool data: ${error.message}`);
    throw error;
  }
};

/**
 * Get a list of all available filters
 */
exports.getAvailableFilters = (req, res) => {
  try {
    const filters = FilterRegistry.getAvailableFilters();
    
    res.json({
      success: true,
      filters
    });
  } catch (error) {
    console.error('Error getting available filters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a new filter instance
 */
exports.createFilter = (req, res) => {
  try {
    const { filterId, instanceId, parameters } = req.body;
    
    if (!filterId) {
      return res.status(400).json({
        success: false,
        error: 'Filter ID is required'
      });
    }
    
    const id = filterManager.addFilter(filterId, instanceId, parameters);
    const config = filterManager.getFilterConfig(id);
    
    res.json({
      success: true,
      filter: config
    });
  } catch (error) {
    console.error('Error creating filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update an existing filter's parameters
 */
exports.updateFilter = (req, res) => {
  try {
    const { instanceId } = req.params;
    const { parameters, enabled } = req.body;
    
    if (!filterManager.activeFilters[instanceId]) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    // Update parameters if provided
    if (parameters) {
      filterManager.updateFilterParameters(instanceId, parameters);
    }
    
    // Update enabled state if provided
    if (enabled !== undefined) {
      filterManager.setFilterEnabled(instanceId, enabled);
    }
    
    const config = filterManager.getFilterConfig(instanceId);
    
    res.json({
      success: true,
      filter: config
    });
  } catch (error) {
    console.error('Error updating filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a filter instance
 */
exports.deleteFilter = (req, res) => {
  try {
    const { instanceId } = req.params;
    
    if (!filterManager.activeFilters[instanceId]) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    const success = filterManager.removeFilter(instanceId);
    
    res.json({
      success
    });
  } catch (error) {
    console.error('Error deleting filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get list of all active filters
 */
exports.getActiveFilters = (req, res) => {
  try {
    const filters = filterManager.getAllFilterConfigs();
    
    res.json({
      success: true,
      filters
    });
  } catch (error) {
    console.error('Error getting active filters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a filter chain
 */
exports.createFilterChain = (req, res) => {
  try {
    const { chainId, filterInstanceIds, options } = req.body;
    
    if (!filterInstanceIds || !Array.isArray(filterInstanceIds)) {
      return res.status(400).json({
        success: false,
        error: 'Filter instance IDs array is required'
      });
    }
    
    const id = filterManager.createFilterChain(chainId, filterInstanceIds, options);
    const chain = filterManager.filterChains[id];
    
    res.json({
      success: true,
      chain: {
        chainId: id,
        filters: [...chain.filters],
        options: { ...chain.options }
      }
    });
  } catch (error) {
    console.error('Error creating filter chain:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all filter chains
 */
exports.getFilterChains = (req, res) => {
  try {
    const chains = filterManager.getAllChainConfigs();
    
    res.json({
      success: true,
      chains
    });
  } catch (error) {
    console.error('Error getting filter chains:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a filter chain
 */
exports.deleteFilterChain = (req, res) => {
  try {
    const { chainId } = req.params;
    
    if (!filterManager.filterChains[chainId]) {
      return res.status(404).json({
        success: false,
        error: 'Filter chain not found'
      });
    }
    
    const success = filterManager.removeFilterChain(chainId);
    
    res.json({
      success
    });
  } catch (error) {
    console.error('Error deleting filter chain:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Apply a filter to a pool
 */
exports.applyFilter = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { poolAddress } = req.body;
    
    if (!instanceId || !poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Both filter instance ID and pool address are required'
      });
    }
    
    // Fetch pool data
    const poolData = await poolDataService.getPoolData(poolAddress);
    
    // Apply filter
    const result = filterManager.runFilter(instanceId, poolData);
    
    res.json({
      success: true,
      result,
      pool: {
        address: poolAddress
      }
    });
  } catch (error) {
    console.error('Error applying filter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Apply a filter chain to a pool
 */
exports.applyFilterChain = async (req, res) => {
  try {
    const { chainId } = req.params;
    const { poolAddress } = req.body;
    
    if (!chainId || !poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Both chain ID and pool address are required'
      });
    }
    
    // Fetch pool data
    const poolData = await poolDataService.getPoolData(poolAddress);
    
    // Apply filter chain
    const result = filterManager.runFilterChain(chainId, poolData);
    
    res.json({
      success: true,
      result,
      pool: {
        address: poolAddress
      }
    });
  } catch (error) {
    console.error('Error applying filter chain:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Scan multiple pools with a filter or filter chain
 */
exports.scanPools = async (req, res) => {
  try {
    const { instanceId, chainId, poolAddresses } = req.body;
    
    if ((!instanceId && !chainId) || !poolAddresses || !Array.isArray(poolAddresses)) {
      return res.status(400).json({
        success: false,
        error: 'Filter/chain ID and pool addresses array are required'
      });
    }
    
    const results = [];
    
    // Process each pool
    for (const poolAddress of poolAddresses) {
      try {
        // Fetch pool data
        const poolData = await poolDataService.getPoolData(poolAddress);
        
        // Apply filter or chain
        let result;
        if (instanceId) {
          result = filterManager.runFilter(instanceId, poolData);
        } else {
          result = filterManager.runFilterChain(chainId, poolData);
        }
        
        results.push({
          poolAddress,
          result
        });
      } catch (poolError) {
        console.error(`Error processing pool ${poolAddress}:`, poolError);
        results.push({
          poolAddress,
          error: poolError.message
        });
      }
    }
    
    // Extract matching pools
    const matches = results.filter(r => r.result && r.result.isMatch);
    
    res.json({
      success: true,
      results,
      matches,
      matchCount: matches.length,
      totalProcessed: results.length
    });
  } catch (error) {
    console.error('Error scanning pools:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Save the current filter configuration
 */
exports.saveConfiguration = (req, res) => {
  try {
    const config = filterManager.saveConfiguration();
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Load a saved filter configuration
 */
exports.loadConfiguration = (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration object is required'
      });
    }
    
    filterManager.loadConfiguration(config);
    
    res.json({
      success: true,
      filters: filterManager.getAllFilterConfigs(),
      chains: filterManager.getAllChainConfigs()
    });
  } catch (error) {
    console.error('Error loading configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
