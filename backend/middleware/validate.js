const { body, validationResult } = require('express-validator');

/**
 * Validation middleware for step/activity inputs
 * Ensures type safety and reasonable ranges for all activity data
 */

const validateStepInput = [
  body('steps')
    .notEmpty()
    .withMessage('Steps field is required')
    .isNumeric()
    .withMessage('Steps must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('Steps must be a valid number');
      if (num < 0) throw new Error('Steps cannot be negative');
      if (num > 100000) throw new Error('Steps cannot exceed 100,000 per request');
      return true;
    }),

  body('source')
    .optional()
    .isIn(['sensor', 'manual', 'api_sync', 'import', 'health_connect'])
    .withMessage('Source must be one of: sensor, manual, api_sync, import, health_connect'),

  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be in ISO 8601 format (e.g., 2026-05-30T14:32:00Z)'),

  body('deviceId')
    .optional()
    .isString()
    .trim()
    .withMessage('Device ID must be a string'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
];

const validateBulkSyncInput = [
  body('records')
    .isArray({ min: 1, max: 500 })
    .withMessage('Records must be an array with 1-500 items'),

  body('records.*.date')
    .notEmpty()
    .isISO8601()
    .withMessage('Each record must have a valid ISO 8601 date'),

  body('records.*.steps')
    .notEmpty()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 100000) {
        throw new Error('Steps must be between 0 and 100,000');
      }
      return true;
    }),

  body('records.*.source')
    .optional()
    .isIn(['sensor', 'manual', 'api_sync', 'import', 'health_connect']),

  body('records.*.timestamp')
    .optional()
    .isISO8601(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Bulk sync validation failed',
        errors: errors.array().map((err, idx) => ({
          record: err.param.match(/\d+/)?.[0] || 'unknown',
          field: err.param.split('.').pop(),
          message: err.msg
        }))
      });
    }
    next();
  }
];

const validateVitalInput = [
  body('heartRate')
    .notEmpty()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 300) {
        throw new Error('Heart rate must be between 0 and 300 bpm');
      }
      return true;
    }),

  body('spo2')
    .notEmpty()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 100) {
        throw new Error('SpO2 must be between 0 and 100%');
      }
      return true;
    }),

  body('temperature')
    .notEmpty()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (num < 20 || num > 45) {
        throw new Error('Temperature must be between 20 and 45°C');
      }
      return true;
    }),

  body('bloodPressureSystolic')
    .optional()
    .isNumeric()
    .withMessage('Blood pressure systolic must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 300) {
        throw new Error('Blood pressure systolic must be between 0 and 300 mmHg');
      }
      return true;
    }),

  body('bloodPressureDiastolic')
    .optional()
    .isNumeric()
    .withMessage('Blood pressure diastolic must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 200) {
        throw new Error('Blood pressure diastolic must be between 0 and 200 mmHg');
      }
      return true;
    }),

  body('bloodGlucose')
    .optional()
    .isNumeric()
    .withMessage('Blood glucose must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 1000) {
        throw new Error('Blood glucose must be between 0 and 1000 mg/dL');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Vital signs validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

const validateProfileUpdate = [
  body('age')
    .optional()
    .isNumeric()
    .custom(value => {
      const num = parseInt(value);
      if (num < 0 || num > 150) {
        throw new Error('Age must be between 0 and 150');
      }
      return true;
    }),

  body('weight')
    .optional()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 500) {
        throw new Error('Weight must be between 0 and 500 kg');
      }
      return true;
    }),

  body('height')
    .optional()
    .isNumeric()
    .custom(value => {
      const num = parseFloat(value);
      if (num < 0 || num > 300) {
        throw new Error('Height must be between 0 and 300 cm');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  body('timezone')
    .optional()
    .isString()
    .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Profile validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

const validateSessionInput = [
  body('stepCount')
    .notEmpty()
    .withMessage('Step count is required')
    .isNumeric()
    .withMessage('Step count must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 100000) {
        throw new Error('Step count must be between 0 and 100,000');
      }
      return true;
    }),

  body('sessionDuration')
    .notEmpty()
    .withMessage('Session duration is required')
    .isNumeric()
    .withMessage('Session duration must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Session duration cannot be negative');
      }
      return true;
    }),

  body('confidenceScore')
    .notEmpty()
    .withMessage('Confidence score is required')
    .isNumeric()
    .withMessage('Confidence score must be a number')
    .custom(value => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 1) {
        throw new Error('Confidence score must be between 0.0 and 1.0');
      }
      return true;
    }),

  body('idempotencyKey')
    .notEmpty()
    .withMessage('Idempotency key is required')
    .isString()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Idempotency key must be at least 10 characters long'),

  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),

  body('timestamps')
    .optional()
    .isArray()
    .withMessage('Timestamps must be an array'),

  body('timestamps.*')
    .optional()
    .isISO8601()
    .withMessage('Each timestamp must be a valid ISO 8601 date'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Session validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateStepInput,
  validateBulkSyncInput,
  validateVitalInput,
  validateProfileUpdate,
  validateSessionInput
};

