require('dotenv').config();
const mongoose = require('mongoose');

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const usersCollection = mongoose.connection.db.collection('users');
  const users = await usersCollection.find({}).toArray();
  console.log(`Found ${users.length} users in database.`);

  let updatedCount = 0;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const name = u.name || 'Thành viên mới';
    
    // Choose an avatar URL or UI-Avatars URL
    const avatarUrl = u.avatar || DEFAULT_AVATARS[i % DEFAULT_AVATARS.length];
    
    await usersCollection.updateOne(
      { _id: u._id },
      { $set: { avatar: avatarUrl } }
    );
    updatedCount++;
    console.log(`Updated user: ${u.email} (${name}) -> ${avatarUrl}`);
  }

  console.log(`Successfully updated avatars for ${updatedCount} users.`);
  await mongoose.disconnect();
}

run().catch(e => {
  console.error('Error updating avatars:', e);
  process.exit(1);
});
