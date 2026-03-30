import mongoose from 'mongoose';
import { config } from '@config/env';
import { User } from '../user/user.model';
import { Admin } from '../admin/admin.model';
import { USER_ROLE, USER_STATUS } from '../user/user.constants';
import { generateUserId } from '../user/user.utils';
import { AdminPermissions } from '../admin/admin.constant';

export const seedSuperAdmin = async () => {
  try {
    const superAdminEmail = config.superAdminEmail;

    // 1. Check if Super Admin already exists
    const isSuperAdminExists = await User.findOne({
      role: USER_ROLE.super_admin,
      email: superAdminEmail,
    });

    if (isSuperAdminExists) {
      console.log('⚡ Super Admin already exists. Skipping seed.');
      return;
    }

    // 2. Start Transaction
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Generate ID (will be SA-00001)
      const customId = await generateUserId(USER_ROLE.super_admin);

      // 3. Create Auth User Record
      const userData = {
        id: customId,
        email: superAdminEmail,
        password: config.superAdminPassword,
        needsPasswordChange: false,
        role: USER_ROLE.super_admin,
        status: USER_STATUS.active,
        isVerified: true,
      };

      const newUser = await User.create([userData], { session });

      if (!newUser.length) {
        throw new Error('Failed to create Super Admin Auth Record');
      }

      // 4. Create Admin Profile Record
      const adminData = {
        id: customId,
        user: newUser[0]._id,
        name: 'System Admin',
        email: superAdminEmail,
        contactNo: '+8801000000000',
        permissions: [AdminPermissions.FULL_ACCESS],
      };

      const newAdmin = await Admin.create([adminData], { session });

      if (!newAdmin.length) {
        throw new Error('Failed to create Super Admin Profile');
      }

      await session.commitTransaction();
      console.log(`✅ Super Admin seeded successfully!`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('❌ Super Admin seeding error:', error);
  }
};
