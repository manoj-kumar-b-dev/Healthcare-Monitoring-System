const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTodayActivity,
  addSteps,
  getWeeklyActivity,
  getActivityStats
} = require('../controllers/activityController');

// All activity routes require authentication
router.use(protect);

router.get('/today', getTodayActivity);
router.post('/steps', addSteps);
router.get('/weekly', getWeeklyActivity);
router.get('/stats', getActivityStats);

module.exports = router;
