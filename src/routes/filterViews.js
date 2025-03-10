// src/routes/filterViews.js
const express = require('express');
const router = express.Router();
const filterViewsController = require('../controllers/filterViewsController');

// Filter dashboard
router.get('/', filterViewsController.renderDashboard);

// Filter analyzer
router.get('/analyzer', filterViewsController.renderAnalyzer);

// Pool scanner
router.get('/scanner', filterViewsController.renderScanner);

// Filter configuration
router.get('/configuration', filterViewsController.renderConfiguration);

module.exports = router;