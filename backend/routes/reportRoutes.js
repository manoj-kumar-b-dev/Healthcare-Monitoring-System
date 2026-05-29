const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateReport,
  getReportHistory
} = require('../controllers/reportController');

router.use(protect);

router.post('/generate', generateReport);
router.get('/history', getReportHistory);

module.exports = router;
