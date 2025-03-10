// src/controllers/filterViewsController.js
const FilterRegistry = require('../filters/FilterRegistry');
const FilterManager = require('../filters/FilterManager');
const { PoolDataService } = require('../exchanges/poolDataService');

// Create a singleton instance of FilterManager (or use the same instance as filterController)
const filterManager = new FilterManager();

// Pool Data Service for fetching data
const poolDataService = new PoolDataService();

/**
 * Render the filters dashboard page
 */
exports.renderDashboard = (req, res) => {
  res.render('filters', {
    title: 'Trading Filters',
  });
};

/**
 * Render the filter analyzer page
 */
exports.renderAnalyzer = (req, res) => {
  res.render('filter-analyzer', {
    title: 'Filter Analyzer',
  });
};

/**
 * Render the pool scanner page
 */
exports.renderScanner = (req, res) => {
  res.render('pool-scanner', {
    title: 'Pool Scanner',
  });
};

/**
 * Render the filter configuration page
 */
exports.renderConfiguration = (req, res) => {
  res.render('filter-configuration', {
    title: 'Filter Configuration',
  });
};
