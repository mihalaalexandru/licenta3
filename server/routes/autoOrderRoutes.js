const express = require('express');
const router = express.Router();
const { createAutoOrder, getAutoOrders, cancelAutoOrder } = require('../controllers/autoOrderController');

router.post('/', createAutoOrder);
router.get('/:userId', getAutoOrders);
router.delete('/:id', cancelAutoOrder);

module.exports = router;