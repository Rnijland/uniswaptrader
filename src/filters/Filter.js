// src/filters/Filter.js
class Filter {
    constructor(name, description, parameters = {}) {
      this.name = name;
      this.description = description;
      this.parameters = parameters;
    }
  
    /**
     * Apply the filter to a specific pool
     * @param {Object} poolData - Pool data to analyze
     * @returns {Object} Result with match status and additional data
     */
    apply(poolData) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Get filter configuration for UI display and serialization
     * @returns {Object} Filter configuration
     */
    getConfig() {
      return {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      };
    }
  
    /**
     * Update filter parameters
     * @param {Object} newParameters - New parameter values
     */
    updateParameters(newParameters) {
      this.parameters = { ...this.parameters, ...newParameters };
    }
  }
  
  module.exports = Filter;