// src/filters/FilterRegistry.js
const GraduationProximityFilter = require('./GraduationProximityFilter');
const TEVLFilter = require('./TEVLFilter');
const LiquidityAnalysisFilter = require('./LiquidityAnalysisFilter');

/**
 * Registry for all available trading filters
 */
class FilterRegistry {
  constructor() {
    this.filters = {};
    this._registerDefaultFilters();
  }
  
  /**
   * Register built-in default filters
   * @private
   */
  _registerDefaultFilters() {
    this.register('graduationProximity', GraduationProximityFilter);
    this.register('tevl', TEVLFilter);
    this.register('liquidityAnalysis', LiquidityAnalysisFilter);
  }
  
  /**
   * Register a new filter class
   * @param {string} id - Unique identifier for the filter
   * @param {class} filterClass - Filter class (extends Filter)
   * @throws {Error} If filter with the same ID already exists
   */
  register(id, filterClass) {
    if (this.filters[id]) {
      throw new Error(`Filter with ID "${id}" is already registered.`);
    }
    
    this.filters[id] = filterClass;
  }
  
  /**
   * Create a new instance of a registered filter
   * @param {string} id - Filter ID
   * @param {Object} parameters - Filter parameters
   * @returns {Filter} New filter instance
   * @throws {Error} If filter is not registered
   */
  create(id, parameters = {}) {
    const FilterClass = this.filters[id];
    
    if (!FilterClass) {
      throw new Error(`Filter with ID "${id}" is not registered.`);
    }
    
    return new FilterClass(parameters);
  }
  
  /**
   * Get a list of all registered filter IDs and their descriptions
   * @returns {Array<Object>} Array of filter metadata
   */
  getAvailableFilters() {
    const result = [];
    
    for (const [id, FilterClass] of Object.entries(this.filters)) {
      // Create temporary instance to get metadata
      const tempInstance = new FilterClass();
      
      result.push({
        id,
        name: tempInstance.name,
        description: tempInstance.description,
        defaultParameters: { ...tempInstance.parameters }
      });
    }
    
    return result;
  }
}

// Export a singleton instance
const registry = new FilterRegistry();
module.exports = registry;