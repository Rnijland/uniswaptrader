// src/routes/filters.js
const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

// Available filters
router.get('/available', filterController.getAvailableFilters);

// Filter instances
router.get('/active', filterController.getActiveFilters);
router.post('/create', filterController.createFilter);
router.put('/:instanceId', filterController.updateFilter);
router.delete('/:instanceId', filterController.deleteFilter);

// Filter chains
router.get('/chains', filterController.getFilterChains);
router.post('/chains/create', filterController.createFilterChain);
router.delete('/chains/:chainId', filterController.deleteFilterChain);

// Apply filters
router.post('/apply/:instanceId', filterController.applyFilter);
router.post('/chains/apply/:chainId', filterController.applyFilterChain);
router.post('/scan', filterController.scanPools);

// Configuration
router.get('/configuration', filterController.saveConfiguration);
router.post('/configuration', filterController.loadConfiguration);

module.exports = router;