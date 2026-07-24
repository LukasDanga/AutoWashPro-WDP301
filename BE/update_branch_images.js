require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const branchImages = [
  {
    nameMatch: 'Tân Bình',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_tan_binh_1784890613098.jpg`,
    targetName: 'autowash_tan_binh.jpg',
  },
  {
    nameMatch: 'Quận 1',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_quan_1_1784890624629.jpg`,
    targetName: 'autowash_quan_1.jpg',
  },
  {
    nameMatch: 'Gò Vấp',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_go_vap_1784890634799.jpg`,
    targetName: 'autowash_go_vap.jpg',
  },
  {
    nameMatch: 'Thủ Đức',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_thu_duc_1784890646829.jpg`,
    targetName: 'autowash_thu_duc.jpg',
  },
  {
    nameMatch: 'Bình Thạnh',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_binh_thanh_1784890660995.jpg`,
    targetName: 'autowash_binh_thanh.jpg',
  },
  {
    nameMatch: 'Hải Châu',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_hai_chau_1784890673279.jpg`,
    targetName: 'autowash_hai_chau.jpg',
  },
  {
    nameMatch: 'Cầu Giấy',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_cau_giay_1784890684810.jpg`,
    targetName: 'autowash_cau_giay.jpg',
  },
  {
    nameMatch: 'Tân Phú',
    source: `C:\\Users\\lukas\\.gemini\\antigravity\\brain\\4d01b288-dc57-4b7f-a3d7-1e0801d33073\\autowash_tan_phu_1784890697295.jpg`,
    targetName: 'autowash_tan_phu.jpg',
  },
];

const publicBranchesDir = path.join(__dirname, '../FE/public/branches');
if (!fs.existsSync(publicBranchesDir)) {
  fs.mkdirSync(publicBranchesDir, { recursive: true });
}

branchImages.forEach((item) => {
  if (fs.existsSync(item.source)) {
    const dest = path.join(publicBranchesDir, item.targetName);
    fs.copyFileSync(item.source, dest);
    console.log(`Copied ${item.targetName} to FE/public/branches/`);
  } else {
    console.error(`Source missing: ${item.source}`);
  }
});

const BranchSchema = new mongoose.Schema({ name: String, image: String }, { strict: false });

async function updateDb(uri, label) {
  console.log(`Connecting to ${label}...`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const BranchModel = conn.model('Branch', BranchSchema);

  for (const item of branchImages) {
    const imgUrl = `/branches/${item.targetName}`;
    const result = await BranchModel.updateMany(
      { name: { $regex: item.nameMatch, $options: 'i' } },
      { $set: { image: imgUrl } }
    );
    console.log(`[${label}] Updated ${result.modifiedCount} branch(es) for '${item.nameMatch}' -> ${imgUrl}`);
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
