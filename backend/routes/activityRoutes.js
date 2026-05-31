const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateStepInput, validateBulkSyncInput, validateSessionInput } = require('../middleware/validate');
const {
  getTodayActivity,
  addSteps,
  getWeeklyActivity,
  getActivityStats,
  sync,
  submitSession
} = require('../controllers/activityController');

// All activity routes require authentication
router.use(protect);

router.get('/today', getTodayActivity);
router.post('/steps', validateStepInput, addSteps);
router.post('/sync', validateBulkSyncInput, sync);
router.post('/session', validateSessionInput, submitSession);
router.get('/weekly', getWeeklyActivity);
router.get('/stats', getActivityStats);

module.exports = router;

