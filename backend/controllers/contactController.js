const User = require('../models/User');

// @desc    Get all emergency contacts
// @route   GET /api/contacts
// @access  Private
const getContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json(user.emergencyContacts);
  } catch (error) {
    next(error);
  }
};

// @desc    Add new emergency contact
// @route   POST /api/contacts
// @access  Private
const addContact = async (req, res, next) => {
  try {
    const { name, phone, email, relationship } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ message: 'Please provide both name and phone number' });
    }

    // Validate phone number loosely (permits +, (), spaces and dashes, 7-15 digits)
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Please provide a valid phone number format' });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email format' });
      }
    }

    const user = await User.findById(req.user._id);
    user.emergencyContacts.push({ name, phone, email, relationship });
    
    await user.save();
    
    res.status(201).json(user.emergencyContacts);
  } catch (error) {
    next(error);
  }
};

// @desc    Update emergency contact
// @route   PUT /api/contacts/:id
// @access  Private
const updateContact = async (req, res, next) => {
  try {
    const { name, phone, email, relationship } = req.body;
    const user = await User.findById(req.user._id);

    // .id() is a mongoose helper to find a subdocument by id
    const contact = user.emergencyContacts.id(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    // Update defined fields
    if (name) contact.name = name;
    if (phone) contact.phone = phone;
    if (email) contact.email = email;
    if (relationship) contact.relationship = relationship;

    await user.save();

    res.status(200).json(contact);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete emergency contact
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const contact = user.emergencyContacts.id(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    // Modern mongoose subdoc removal syntax:
    user.emergencyContacts.pull(req.params.id);
    await user.save();

    res.status(200).json({ message: 'Emergency contact removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  addContact,
  updateContact,
  deleteContact
};
