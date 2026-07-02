const express = require('express');
const router = express.Router();
const { getPortfolio, getBalanceHistory } = require('../controllers/portfolioController');
const { requireAuth } = require('../middleware/auth');

router.get('/history/:userId', requireAuth, getBalanceHistory);
router.get('/:userId', requireAuth, getPortfolio);

module.exports = router;