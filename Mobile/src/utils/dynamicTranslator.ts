/**
 * Smart Regex Translator for AutoWashPro
 * Parses and translates common Vietnamese template strings from the admin CMS into English.
 */

export const translateDynamicText = (text: string, lang: string): string => {
  if (lang !== 'en' || !text) return text;
  
  let translated = text;

  // Pattern 1: Giảm {X}% -> {X}% off
  translated = translated.replace(/Giảm\s+([\d.,]+%)/gi, '$1 off');
  
  // Pattern 2: Giảm {X}đ -> {X}đ off
  translated = translated.replace(/Giảm\s+([\d.,]+đ)/gi, '$1 off');
  
  // Pattern 3: cho tất cả gói dịch vụ -> for all service packages
  translated = translated.replace(/cho tất cả gói dịch vụ/gi, 'for all service packages');
  
  // Pattern 4: cho đơn từ {X}đ -> on orders from {X}đ
  translated = translated.replace(/cho đơn từ\s+([\d.,]+đ)/gi, 'on orders from $1');
  
  // Pattern 5: tại {X} -> at {X}
  translated = translated.replace(/\btại\b/gi, 'at');
  
  // Pattern 6: Quận {X} -> District {X}
  translated = translated.replace(/Quận\s+(\d+)/gi, 'District $1');

  // Specific hardcoded gifts
  translated = translated.replace(/Tặng Phủ Nano/gi, 'Free Nano Coating');
  translated = translated.replace(/Tặng Rửa Động Cơ/gi, 'Free Engine Wash');
  translated = translated.replace(/Giảm giá đặc biệt/gi, 'Special Discount');
  translated = translated.replace(/Khuyến mãi mùa hè/gi, 'Summer Promotion');
  
  // Specific free add-on services
  translated = translated.replace(/Miễn phí 1 dịch vụ lẻ bất kỳ/gi, 'Free any add-on service');
  translated = translated.replace(/Miễn phí dịch vụ lẻ/gi, 'Free add-on service');
  translated = translated.replace(/\(tối đa/gi, '(up to');
  translated = translated.replace(/khi đặt gói/gi, 'when booking');
  translated = translated.replace(/bất kỳ/gi, 'any');
  
  // Common service names
  translated = translated.replace(/Rửa xe máy/gi, 'Motorcycle Wash');
  translated = translated.replace(/Rửa xe ô tô/gi, 'Car Wash');
  translated = translated.replace(/Rửa xe/gi, 'Car Wash');
  translated = translated.replace(/Rửa sạch/gi, 'Wash');
  translated = translated.replace(/Rửa chi tiết/gi, 'Detail Wash');
  translated = translated.replace(/Chăm sóc toàn diện/gi, 'Comprehensive Care');
  translated = translated.replace(/Chăm sóc/gi, 'Care');
  
  // Locations / Addresses
  translated = translated.replace(/Phường\s+([\w\d\s]+?)(?=,|$)/gi, 'Ward $1');
  translated = translated.replace(/Thành phố/gi, 'City');
  translated = translated.replace(/Đường/gi, 'Street');

  // Transactions
  translated = translated.replace(/Nạp tiền vào ví/gi, 'Wallet Top-up');
  translated = translated.replace(/Nạp tiền/gi, 'Top-up');
  translated = translated.replace(/Thanh toán dịch vụ/gi, 'Service Payment');
  translated = translated.replace(/Thanh toán/gi, 'Payment');
  translated = translated.replace(/Hoàn tiền/gi, 'Refund');

  // Booking statuses
  translated = translated.replace(/^Đang chờ$/gi, 'Pending');
  translated = translated.replace(/^Đã xác nhận$/gi, 'Confirmed');
  translated = translated.replace(/^Đang xử lý$/gi, 'In Progress');
  translated = translated.replace(/^Hoàn thành$/gi, 'Completed');
  translated = translated.replace(/^Đã hủy$/gi, 'Cancelled');
  translated = translated.replace(/^Thất bại$/gi, 'Failed');

  // Notifications
  translated = translated.replace(/Lịch hẹn mới/gi, 'New Booking');
  translated = translated.replace(/Lịch hẹn của bạn/gi, 'Your booking');
  translated = translated.replace(/Lịch hẹn/gi, 'Booking');
  translated = translated.replace(/đã được xác nhận/gi, 'has been confirmed');
  translated = translated.replace(/đã bị hủy/gi, 'has been cancelled');
  translated = translated.replace(/thành công/gi, 'successfully');
  translated = translated.replace(/Bạn nhận được voucher mới/gi, 'You received a new voucher');

  // Fix capitalization if needed
  translated = translated.charAt(0).toUpperCase() + translated.slice(1);

  return translated;
};
