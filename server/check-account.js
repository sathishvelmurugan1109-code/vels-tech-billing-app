const mongoose = require('mongoose');
const User = require('./models/User');
const Business = require('./models/Business');

async function checkAccount() {
  try {
    await mongoose.connect('mongodb://localhost:27017/vels_billing');
    console.log('[DB] Connected');
    
    const user = await User.findOne({ email: 'velstechoffical@gmail.com' });
    if (user) {
      console.log('[User] Found:', user.email);
      console.log('[User] Role:', user.role);
      console.log('[User] Active:', user.isActive);
      console.log('[User] BusinessId:', user.businessId);
      console.log('[User] Password hash length:', user.passwordHash ? user.passwordHash.length : 'N/A');
      console.log('[User] Password hash preview:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'N/A');
      
      const business = await Business.findById(user.businessId);
      if (business) {
        console.log('[Business] Found:', business.businessName, 'Status:', business.status);
      }
    } else {
      console.log('[User] NOT FOUND');
    }
  } catch (err) {
    console.error('[Error]', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAccount();
