const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  updateSettings
} = require('../controllers/userProfileController');

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.route('/settings')
  .put(updateSettings);

module.exports = router;
