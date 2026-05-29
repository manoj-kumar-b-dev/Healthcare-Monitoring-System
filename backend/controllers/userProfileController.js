const User = require('../models/User');

// Helper: Validate profile data
const validateProfileData = (data) => {
  const errors = [];
  
  if (data.age !== undefined && (data.age < 0 || data.age > 150)) {
    errors.push('Age must be between 0 and 150');
  }
  if (data.weight !== undefined && (data.weight < 0 || data.weight > 500)) {
    errors.push('Weight must be between 0 and 500 kg');
  }
  if (data.height !== undefined && (data.height < 0 || data.height > 300)) {
    errors.push('Height must be between 0 and 300 cm');
  }
  if (data.gender && !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Gender must be male, female, or other');
  }
  if (data.dateOfBirth && isNaN(new Date(data.dateOfBirth).getTime())) {
    errors.push('Invalid date of birth format');
  }
  
  return errors;
};

// @desc    Get user profile details
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    console.log('[Profile Controller] Fetching profile for user:', req.user._id);
    
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      console.warn('[Profile Controller] User not found:', req.user._id);
      return res.status(404).json({ 
        success: false,
        message: 'User profile not found' 
      });
    }

    // Return flat user object that matches frontend expectations
    const response = {
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        weight: user.weight,
        height: user.height,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };
    
    console.log('[Profile Controller] Profile fetched successfully');
    res.status(200).json(response);
  } catch (error) {
    console.error('[Profile Controller] Error fetching profile:', error.message);
    next(error);
  }
};

// @desc    Update user profile specifics
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    console.log('[Profile Controller] Update request body:', Object.keys(req.body));
    
    const { age, weight, height, gender, dateOfBirth } = req.body;
    
    // Validate incoming data
    const validationErrors = validateProfileData({ age, weight, height, gender, dateOfBirth });
    if (validationErrors.length > 0) {
      console.warn('[Profile Controller] Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      console.warn('[Profile Controller] User not found for update:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update only provided fields (prevent accidental overwrites with null/undefined)
    if (age !== undefined && age !== '') user.age = Number(age);
    if (weight !== undefined && weight !== '') user.weight = Number(weight);
    if (height !== undefined && height !== '') user.height = Number(height);
    if (gender !== undefined && gender !== '') user.gender = gender.toLowerCase();
    if (dateOfBirth !== undefined && dateOfBirth !== '') user.dateOfBirth = new Date(dateOfBirth);
    
    const updatedUser = await user.save();
    console.log('[Profile Controller] Profile updated successfully for user:', req.user._id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        age: updatedUser.age,
        weight: updatedUser.weight,
        height: updatedUser.height,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
        settings: updatedUser.settings
      }
    });
  } catch (error) {
    console.error('[Profile Controller] Error updating profile:', error.message);
    next(error);
  }
};

// @desc    Update user app settings
// @route   PUT /api/user/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    console.log('[Profile Controller] Updating settings for user:', req.user._id);
    
    const { soundAlerts, stepGoal, unitPreference } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      console.warn('[Profile Controller] User not found for settings update:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.settings) {
      user.settings = {};
    }

    // Update settings with validation
    if (soundAlerts !== undefined) {
      user.settings.soundAlerts = Boolean(soundAlerts);
    }
    if (stepGoal !== undefined) {
      const goalNum = Number(stepGoal);
      if (goalNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Daily step goal must be positive'
        });
      }
      user.settings.dailyStepGoal = goalNum;
    }
    if (unitPreference !== undefined) {
      if (!['metric', 'imperial'].includes(unitPreference)) {
        return res.status(400).json({
          success: false,
          message: 'Unit preference must be metric or imperial'
        });
      }
      user.settings.unit = unitPreference;
    }

    const updatedUser = await user.save();
    console.log('[Profile Controller] Settings updated successfully');

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedUser.settings
    });
  } catch (error) {
    console.error('[Profile Controller] Error updating settings:', error.message);
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateSettings
};
