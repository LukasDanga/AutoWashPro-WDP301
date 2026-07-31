const fs = require('fs');

let content = fs.readFileSync('BE/src/services/slotPack.service.js', 'utf8');

// The original getDiscountPercent function
content = content.replace(
  '/** Tính % chiết khấu dựa theo số lượng slot */\nfunction getDiscountPercent(totalSlots) {\n  if (totalSlots >= 20) return 15;\n  if (totalSlots >= 10) return 10;\n  if (totalSlots >= 5)  return 5;\n  return 0;\n}',
  ''
);

// We will fetch SLOT_PACK_DISCOUNTS and SLOT_PACK_VIP_BONUS_DISCOUNTS dynamically
content = content.replace(
  '      let discountPercent = getDiscountPercent(totalSlots);\n      if (user.tier === \'diamond\') discountPercent += 10;\n      else if (user.tier === \'gold\') discountPercent += 5;\n      if (discountPercent > 100) discountPercent = 100;',
  `      const [packDiscounts, vipBonuses] = await Promise.all([
        configService.get('SLOT_PACK_DISCOUNTS', [
          { minSlots: 5, discountPercent: 5 },
          { minSlots: 10, discountPercent: 10 },
          { minSlots: 20, discountPercent: 15 }
        ]),
        configService.get('SLOT_PACK_VIP_BONUS_DISCOUNTS', { gold: 5, diamond: 10 })
      ]);

      let discountPercent = 0;
      // Sort descending by minSlots to find the highest applicable tier
      const sortedDiscounts = [...packDiscounts].sort((a, b) => b.minSlots - a.minSlots);
      for (const tier of sortedDiscounts) {
        if (totalSlots >= tier.minSlots) {
          discountPercent = tier.discountPercent;
          break;
        }
      }
      
      if (vipBonuses[user.tier]) {
        discountPercent += vipBonuses[user.tier];
      }
      
      if (discountPercent > 100) discountPercent = 100;`
);

fs.writeFileSync('BE/src/services/slotPack.service.js', content, 'utf8');
console.log('slotPack.service.js updated successfully!');
