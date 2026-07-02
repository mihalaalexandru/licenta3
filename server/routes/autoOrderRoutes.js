const express = require('express');
const router = express.Router();
const { createAutoOrder, getAutoOrders, cancelAutoOrder } = require('../controllers/autoOrderController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createAutoOrder);
router.get('/:userId', requireAuth, getAutoOrders);
router.delete('/:id', requireAuth, cancelAutoOrder);

module.exports = router;