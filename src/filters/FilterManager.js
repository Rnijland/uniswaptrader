// src/filters/FilterManager.js
const FilterRegistry = require('./FilterRegistry');

/**
 * Manages filter configurations and runs filter analysis
 */
class FilterManager {
  constructor() {
    this.activeFilters = {};
    this.filterChains = {};
  }
  
  /**
   * Add a filter to the active filters
   * @param {string} filterId - ID of the filter from FilterRegistry
   * @param {string} instanceId - Unique ID for this filter instance
   * @param {Object} parameters - Parameters for the filter
   * @returns {string} The instance ID
   */
  addFilter(filterId, instanceId = null, parameters = {}) {
    // Generate instance ID if not provided
    if (!instanceId) {
      instanceId = `${filterId}_${Date.now()}`;
    }
    
    // Create filter from registry
    const filter = FilterRegistry.create(filterId, parameters);
    
    // Store in active filters
    this.activeFilters[instanceId] = {
      filterId,
      filter,
      enabled: true,
      lastRun: null,
      lastResult: null
    };
    
    return instanceId;
  }
  
  /**
   * Remove a filter by instance ID
   * @param {string} instanceId - ID of the filter instance
   * @returns {boolean} Whether removal was successful
   */
  removeFilter(instanceId) {
    if (!this.activeFilters[instanceId]) {
      return false;
    }
    
    delete this.activeFilters[instanceId];
    
    // Remove from any chains
    for (const chainId in this.filterChains) {
      this.filterChains[chainId].filters = this.filterChains[chainId].filters
        .filter(id => id !== instanceId);
    }
    
    return true;
  }
  
  /**
   * Update parameters for a filter
   * @param {string} instanceId - ID of the filter instance
   * @param {Object} parameters - New parameter values
   * @returns {boolean} Whether update was successful
   */
  updateFilterParameters(instanceId, parameters) {
    if (!this.activeFilters[instanceId]) {
      return false;
    }
    
    this.activeFilters[instanceId].filter.updateParameters(parameters);
    return true;
  }
  
  /**
   * Enable or disable a filter
   * @param {string} instanceId - ID of the filter instance
   * @param {boolean} enabled - Whether filter should be enabled
   * @returns {boolean} Whether update was successful
   */
  setFilterEnabled(instanceId, enabled) {
    if (!this.activeFilters[instanceId]) {
      return false;
    }
    
    this.activeFilters[instanceId].enabled = !!enabled;
    return true;
  }
  
  /**
   * Create a filter chain with multiple filters
   * @param {string} chainId - ID for the filter chain
   * @param {Array<string>} filterInstanceIds - Array of filter instance IDs
   * @param {Object} options - Chain options (e.g., matchMode: 'all'|'any')
   * @returns {string} The chain ID
   */
  createFilterChain(chainId = null, filterInstanceIds = [], options = {}) {
    // Generate chain ID if not provided
    if (!chainId) {
      chainId = `chain_${Date.now()}`;
    }
    
    // Validate filter IDs
    const validFilters = filterInstanceIds.filter(id => this.activeFilters[id]);
    
    this.filterChains[chainId] = {
      filters: validFilters,
      options: {
        matchMode: options.matchMode || 'all', // 'all' or 'any'
        ...options
      },
      lastRun: null,
      lastResult: null
    };
    
    return chainId;
  }
  
  /**
   * Remove a filter chain by ID
   * @param {string} chainId - ID of the filter chain
   * @returns {boolean} Whether removal was successful
   */
  removeFilterChain(chainId) {
    if (!this.filterChains[chainId]) {
      return false;
    }
    
    delete this.filterChains[chainId];
    return true;
  }
  
  /**
   * Run a specific filter on pool data
   * @param {string} instanceId - ID of the filter instance
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Filter result
   */
  runFilter(instanceId, poolData) {
    if (!this.activeFilters[instanceId]) {
      throw new Error(`Filter with instance ID "${instanceId}" not found.`);
    }
    
    if (!this.activeFilters[instanceId].enabled) {
      return {
        instanceId,
        isMatch: false,
        disabled: true
      };
    }
    
    try {
      const result = this.activeFilters[instanceId].filter.apply(poolData);
      
      // Store last run info
      this.activeFilters[instanceId].lastRun = new Date();
      this.activeFilters[instanceId].lastResult = result;
      
      return {
        instanceId,
        filterId: this.activeFilters[instanceId].filterId,
        filterName: this.activeFilters[instanceId].filter.name,
        isMatch: result.isMatch,
        data: result.data
      };
    } catch (error) {
      console.error(`Error running filter ${instanceId}:`, error);
      return {
        instanceId,
        filterId: this.activeFilters[instanceId].filterId,
        filterName: this.activeFilters[instanceId].filter.name,
        isMatch: false,
        error: error.message
      };
    }
  }
  
  /**
   * Run a filter chain on pool data
   * @param {string} chainId - ID of the filter chain
   * @param {Object} poolData - Pool data to analyze
   * @returns {Object} Chain result with individual filter results
   */
  runFilterChain(chainId, poolData) {
    if (!this.filterChains[chainId]) {
      throw new Error(`Filter chain with ID "${chainId}" not found.`);
    }
    
    const chain = this.filterChains[chainId];
    const results = [];
    let chainIsMatch = chain.options.matchMode === 'all'; // True for 'all', false for 'any'
    
    for (const instanceId of chain.filters) {
      const result = this.runFilter(instanceId, poolData);
      results.push(result);
      
      if (chain.options.matchMode === 'all' && !result.isMatch) {
        chainIsMatch = false;
      } else if (chain.options.matchMode === 'any' && result.isMatch) {
        chainIsMatch = true;
      }
    }
    
    const chainResult = {
      chainId,
      isMatch: chainIsMatch,
      matchMode: chain.options.matchMode,
      filterResults: results
    };
    
    // Store last run info
    this.filterChains[chainId].lastRun = new Date();
    this.filterChains[chainId].lastResult = chainResult;
    
    return chainResult;
  }
  
  /**
   * Run all filters on pool data and get matching results
   * @param {Object} poolData - Pool data to analyze
   * @returns {Array<Object>} Array of matching filter results
   */
  findMatches(poolData) {
    const matches = [];
    
    // Check individual filters
    for (const instanceId in this.activeFilters) {
      const result = this.runFilter(instanceId, poolData);
      if (result.isMatch) {
        matches.push(result);
      }
    }
    
    return matches;
  }
  
  /**
   * Run all filter chains on pool data and get matching results
   * @param {Object} poolData - Pool data to analyze
   * @returns {Array<Object>} Array of matching chain results
   */
  findChainMatches(poolData) {
    const matches = [];
    
    // Check filter chains
    for (const chainId in this.filterChains) {
      const result = this.runFilterChain(chainId, poolData);
      if (result.isMatch) {
        matches.push(result);
      }
    }
    
    return matches;
  }
  
  /**
   * Get the configuration of a filter
   * @param {string} instanceId - ID of the filter instance
   * @returns {Object} Filter configuration
   */
  getFilterConfig(instanceId) {
    if (!this.activeFilters[instanceId]) {
      throw new Error(`Filter with instance ID "${instanceId}" not found.`);
    }
    
    const filterInfo = this.activeFilters[instanceId];
    
    return {
      instanceId,
      filterId: filterInfo.filterId,
      name: filterInfo.filter.name,
      description: filterInfo.filter.description,
      parameters: { ...filterInfo.filter.parameters },
      enabled: filterInfo.enabled,
      lastRun: filterInfo.lastRun,
      hasLastResult: !!filterInfo.lastResult
    };
  }
  
  /**
   * Get all active filter configurations
   * @returns {Object} Map of instance IDs to filter configurations
   */
  getAllFilterConfigs() {
    const configs = {};
    
    for (const instanceId in this.activeFilters) {
      configs[instanceId] = this.getFilterConfig(instanceId);
    }
    
    return configs;
  }
  
  /**
   * Get all filter chain configurations
   * @returns {Object} Map of chain IDs to chain configurations
   */
  getAllChainConfigs() {
    const configs = {};
    
    for (const chainId in this.filterChains) {
      const chain = this.filterChains[chainId];
      
      configs[chainId] = {
        chainId,
        filters: [...chain.filters],
        options: { ...chain.options },
        lastRun: chain.lastRun,
        hasLastResult: !!chain.lastResult
      };
    }
    
    return configs;
  }
  
  /**
   * Save the current filter configuration to a serializable object
   * @returns {Object} Filter manager configuration
   */
  saveConfiguration() {
    const config = {
      filters: {},
      chains: {}
    };
    
    // Save filters
    for (const instanceId in this.activeFilters) {
      const filterInfo = this.activeFilters[instanceId];
      
      config.filters[instanceId] = {
        filterId: filterInfo.filterId,
        parameters: { ...filterInfo.filter.parameters },
        enabled: filterInfo.enabled
      };
    }
    
    // Save chains
    for (const chainId in this.filterChains) {
      const chain = this.filterChains[chainId];
      
      config.chains[chainId] = {
        filters: [...chain.filters],
        options: { ...chain.options }
      };
    }
    
    return config;
  }
  
  /**
   * Load filter configuration from saved object
   * @param {Object} config - Configuration object from saveConfiguration()
   */
  loadConfiguration(config) {
    // Clear existing configurations
    this.activeFilters = {};
    this.filterChains = {};
    
    // Load filters
    for (const instanceId in config.filters) {
      const filterConfig = config.filters[instanceId];
      
      try {
        this.addFilter(
          filterConfig.filterId,
          instanceId,
          filterConfig.parameters
        );
        
        // Set enabled state
        this.activeFilters[instanceId].enabled = filterConfig.enabled;
      } catch (error) {
        console.error(`Error loading filter ${instanceId}:`, error);
      }
    }
    
    // Load chains
    for (const chainId in config.chains) {
      const chainConfig = config.chains[chainId];
      
      try {
        this.createFilterChain(
          chainId,
          chainConfig.filters,
          chainConfig.options
        );
      } catch (error) {
        console.error(`Error loading chain ${chainId}:`, error);
      }
    }
  }
}

module.exports = FilterManager;