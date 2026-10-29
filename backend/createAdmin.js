require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function run() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.log('Usage: node createAdmin.js "Full Name" email@example.com password');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });

  if (existing) {
    console.log('A user with this email already exists. Change its role to "admin" in MongoDB Compass instead.');
  } else {
    await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      role: 'admin'
    });
    console.log(`Admin account created for ${cleanEmail}`);
  }

  await mongoose.disconnect();
}

run();