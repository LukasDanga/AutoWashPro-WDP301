require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');

const emails = [
  { nameMatch: 'Tân Bình', email: 'tanbinh@autowashpro.vn' },
  { nameMatch: 'Hải Châu', email: 'haichau@autowashpro.vn' },
  { nameMatch: 'Cầu Giấy', email: 'caugiay@autowashpro.vn' },
];

const BranchSchema = new mongoose.Schema({ name: String, email: String }, { strict: false });

async function updateDb(uri, label) {
  console.log(`Connecting to ${label}...`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const BranchModel = conn.model('Branch', BranchSchema);

  for (const item of emails) {
    const result = await BranchModel.updateMany(
      { name: { $regex: item.nameMatch, $options: 'i' } },
      { $set: { email: item.email } }
    );
    console.log(`[${label}] Updated ${result.modifiedCount} branch(es) for '${item.nameMatch}' -> ${item.email}`);
  }

  await conn.close();
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const atlasUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/washpro';

  if (atlasUri) {
    await updateDb(atlasUri, 'Atlas DB');
  }
  try {
    await updateDb(localUri, 'Local DB');
  } catch (e) {
    console.log('Local DB update skipped:', e.message);
  }
  console.log('Done!');
}

main().catch(console.error);
