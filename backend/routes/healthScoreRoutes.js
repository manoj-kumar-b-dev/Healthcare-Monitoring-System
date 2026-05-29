const express = require('express');
const router  = express.Router();
const {
  getLatestHealthScore,
  triggerCalculation,
  getHealthScoreHistory,
  getHealthSummary,
} = require('../controllers/healthScoreController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',          getLatestHealthScore);
router.post('/calculate', triggerCalculation);
router.get('/history',   getHealthScoreHistory);
router.get('/summary',   getHealthSummary);

module.exports = router;
