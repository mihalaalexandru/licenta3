const express = require('express');
const router = express.Router();
const { createAlert, getAlerts, deleteAlert } = require('../controllers/alertController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createAlert);
router.get('/:userId', requireAuth, getAlerts);
router.delete('/:id', requireAuth, deleteAlert);

module.exports = router;