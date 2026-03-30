import { Connection } from 'mongoose';
import { config } from '@config/env';
import { getUserModel } from '../user/user.model';
import { getAdminModel } from '../admin/admin.model';
import { USER_ROLE, USER_STATUS } from '../user/user.constants';
import { generateUserId } from '../user/user.utils';

export const seedSuperAdmin = async (connection: Connection, brand: 'bringByAir' | 'pandaBD') => {
  try {
    //  Initialize Models on this specific connection
    const UserModel = getUserModel(connection);
    const AdminModel = getAdminModel(connection);

    //  Check if Super Admin already exists
    const superAdminEmail = config.superAdminEmail;
    const isSuperAdminExists = await UserModel.findOne({
      role: USER_ROLE.super_admin,
      email: superAdminEmail,
    });

    if (isSuperAdminExists) {
      return; // Already exists, skip
    }

    // Start Transaction on THIS connection
    const session = await connection.startSession();

    try {
      session.startTransaction();

      const customId = await generateUserId(USER_ROLE.super_admin, connection);

      //  Create User
      const userData = {
        id: customId,
        email: superAdminEmail,
        password: config.superAdminPassword,
        needsPasswordChange: false,
        role: USER_ROLE.super_admin,
        status: USER_STATUS.active,
        isVerified: true,
        storePreference: brand,
      };

      const newUser = await UserModel.create([userData], { session });

      if (!newUser.length) {
        throw new Error('Failed to create Super Admin User');
      }

      // 5. Create Admin Profile
      const adminData = {
        id: customId,
        user: newUser[0]._id,
        name: { firstName: 'Super', lastName: 'Admin' },
        email: superAdminEmail,
        contactNo: '+8801000000000',
        managementSection: 'Root',
        permissions: ['super_access'], // Full access
      };

      const newAdmin = await AdminModel.create([adminData], { session });

      if (!newAdmin.length) {
        throw new Error('Failed to create Super Admin Profile');
      }

      await session.commitTransaction();
      console.log(`✅ Super Admin seeded in DB!`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('❌ Super Admin seeding error:', error);
  }
};
