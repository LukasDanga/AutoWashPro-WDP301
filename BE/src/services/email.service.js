const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendPasswordResetEmail = async (email, otp) => {
  console.log(`[EmailService] Sending Password Reset OTP to ${email}`);
  return transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Mã xác nhận khôi phục mật khẩu - AutoWashPro',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Khôi phục mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản AutoWashPro. Dưới đây là mã xác nhận (OTP) của bạn:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0; border-radius: 8px; border: 1px dashed #cbd5e1;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">Mã này sẽ hết hạn sau <strong>15 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email này.</p>
      </div>
    `
  });
};

exports.sendBookingConfirmationEmail = async (email, bookingInfo) => {
  console.log(`[EmailService] Sending Booking Confirmation Email to ${email} (Code: ${bookingInfo?.bookingCode || 'N/A'})`);
  const isRecurring = bookingInfo.bookingType === 'recurring';
  const isSlotPack = bookingInfo.bookingType === 'slot_pack_usage';
  
  let typeLabel = 'Đơn lẻ';
  if (isRecurring) typeLabel = 'Lịch định kỳ';
  else if (isSlotPack) typeLabel = 'Gói lượt';

  const packageName = bookingInfo.packageName || (bookingInfo.packageId && bookingInfo.packageId.name) || 'Gói dịch vụ rửa xe';

  return transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Xác nhận đặt lịch thành công - AutoWashPro (${bookingInfo.bookingCode || ''})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Đặt lịch thành công!</h2>
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của AutoWashPro. Dưới đây là thông tin lịch hẹn của bạn:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${bookingInfo.bookingCode ? `<p><strong>Mã đặt lịch:</strong> <span style="font-size: 16px; font-weight: bold; color: #2563eb;">${bookingInfo.bookingCode}</span></p>` : ''}
          <p><strong>Loại đặt lịch:</strong> ${typeLabel}</p>
          <p><strong>Ngày hẹn:</strong> ${new Date(bookingInfo.bookingDate).toLocaleDateString('vi-VN')}</p>
          <p><strong>Giờ hẹn:</strong> ${bookingInfo.startTime || '—'}</p>
          <p><strong>Dịch vụ:</strong> ${packageName}</p>
          <p><strong>Tổng tiền:</strong> ${Number(bookingInfo.finalPrice || bookingInfo.totalAmount || 0).toLocaleString('vi-VN')}₫</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Bạn có thể theo dõi tiến trình hoặc hủy lịch trong mục Quản lý lịch hẹn trên ứng dụng.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Hệ thống chăm sóc xe AutoWashPro</p>
      </div>
    `
  });
};

exports.sendCancellationOtpEmail = async (email, otp) => {
  console.log(`[EmailService] Sending Cancellation OTP (${otp}) to ${email}`);
  return transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Mã OTP xác nhận hủy lịch - AutoWashPro`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">Yêu cầu hủy lịch hẹn</h2>
        <p>Xin chào,</p>
        <p>Bạn đang yêu cầu hủy một lịch hẹn trên hệ thống AutoWashPro. Dưới đây là mã OTP để xác nhận việc hủy đơn của bạn:</p>
        <div style="background-color: #fef2f2; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #dc2626; margin: 20px 0; border-radius: 8px; border: 1px dashed #fca5a5;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">Mã này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Hệ thống chăm sóc xe AutoWashPro</p>
      </div>
    `
  });
};

exports.sendSlotPackConfirmationEmail = async (email, slotPack) => {
  console.log(`[EmailService] Sending SlotPack Confirmation Email to ${email} (Code: ${slotPack?.packCode || 'N/A'})`);
  return transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Xác nhận mua gói lượt thành công - AutoWashPro`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981;">Mua gói lượt thành công!</h2>
        <p>Xin chào,</p>
        <p>Bạn đã thanh toán thành công Gói Lượt tại AutoWashPro. Dưới đây là thông tin chi tiết:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Mã gói:</strong> <span style="font-size: 18px; font-weight: bold; color: #2563eb;">${slotPack.packCode}</span></p>
          <p><strong>Tổng số lượt:</strong> ${slotPack.totalSlots} lượt</p>
          <p><strong>Tổng tiền:</strong> ${Number(slotPack.finalPriceAfterVoucher || slotPack.finalPrice || 0).toLocaleString('vi-VN')}₫</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Bạn có thể sử dụng mã này để đặt lịch rửa xe mà không cần thanh toán thêm tại cửa hàng.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Hệ thống chăm sóc xe AutoWashPro</p>
      </div>
    `
  });
};

exports.sendCancellationSuccessEmail = async (email, info, refundAmount) => {
  console.log(`[EmailService] Sending Cancellation Success Email to ${email} (Code: ${info?.code || 'N/A'})`);
  return transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Thông báo hủy đơn thành công - AutoWashPro`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #f59e0b;">Hủy đơn thành công</h2>
        <p>Xin chào,</p>
        <p>Yêu cầu hủy ${info.type === 'slot_pack' ? 'Gói lượt' : 'Lịch hẹn'} của bạn đã được xử lý thành công.</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde68a;">
          <p><strong>Mã đơn:</strong> <span style="font-weight: bold;">${info.code}</span></p>
          ${refundAmount > 0 
            ? `<p style="color: #047857; font-weight: bold;">Số tiền được hoàn lại: ${Number(refundAmount).toLocaleString('vi-VN')}₫</p>
               <p style="font-size: 13px; margin-top: 5px;">Số tiền này đã được cộng trực tiếp vào <strong>Ví điện tử</strong> trên hệ thống của bạn.</p>` 
            : `<p>Đơn của bạn không phát sinh hoàn tiền theo chính sách của hệ thống.</p>`
          }
        </div>
        <p style="color: #64748b; font-size: 14px;">Cảm ơn bạn đã sử dụng dịch vụ của AutoWashPro. Hẹn gặp lại bạn lần sau!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Hệ thống chăm sóc xe AutoWashPro</p>
      </div>
    `
  });
};
