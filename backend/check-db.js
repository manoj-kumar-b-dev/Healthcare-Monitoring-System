require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const users = await User.find({});
    console.log(`Found ${users.length} users.`);
    for (const user of users) {
      console.log(`User: ${user.username}, Email: ${user.email}, Contacts count: ${user.emergencyContacts?.length || 0}`);
      if (user.emergencyContacts?.length > 0) {
        console.log(JSON.stringify(user.emergencyContacts, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
