const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getContacts,
  addContact,
  updateContact,
  deleteContact
} = require('../controllers/contactController');

router.use(protect);

router.route('/')
  .get(getContacts)
  .post(addContact);

router.route('/:id')
  .put(updateContact)
  .delete(deleteContact);

module.exports = router;
