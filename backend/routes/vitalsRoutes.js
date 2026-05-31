const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateVitalInput } = require('../middleware/validate');
const {
  createVitalSign,
  getVitalHistory,
  getLatestVitalSign,
  getVitalStats,
  deleteVitalSign
} = require('../controllers/vitalsController');

// All vitals routes require authentication
router.use(protect);

router.route('/')
  .post(validateVitalInput, createVitalSign)
  .get(getVitalHistory);

router.get('/latest', getLatestVitalSign);
router.get('/stats', getVitalStats);

router.route('/:id')
  .delete(deleteVitalSign);

module.exports = router;
