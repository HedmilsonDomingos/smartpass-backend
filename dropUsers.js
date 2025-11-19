const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const dropUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    await mongoose.connection.db.dropCollection('users');
    console.log('Users collection dropped');
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
};

dropUsers();
