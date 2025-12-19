import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config({ path: './.env' });

const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@eduplatform.kz' });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@eduplatform.kz',
      password: 'Admin123!',
      role: 'admin',
      isEmailVerified: true,
    });

    console.log('Admin user created successfully');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: Admin123!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

