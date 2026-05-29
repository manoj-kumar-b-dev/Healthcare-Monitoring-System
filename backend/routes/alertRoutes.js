const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { triggerEmergency } = require('../controllers/alertController');

// All alert routes require authentication
router.use(protect);

router.post('/emergency', triggerEmergency);

module.exports = router;
