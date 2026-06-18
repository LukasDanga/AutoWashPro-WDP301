const { GoogleGenAI } = require('@google/genai');
const branchService = require('./branch.service');
const packageService = require('./package.service');
const bookingService = require('./booking.service');
const { Vehicle } = require('../models');

const SESSION_TIMEOUT = 30 * 60 * 1000;
const sessions = new Map();

function getSession(sessionId) {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActivity > SESSION_TIMEOUT) sessions.delete(id);
  }
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { history: [], lastActivity: now });
  } else {
    sessions.get(sessionId).lastActivity = now;
  }
  return sessions.get(sessionId);
}

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI của AutoWashPro - hệ thống đặt lịch rửa xe chuyên nghiệp.
Bạn có thể:
- Trả lời câu hỏi về dịch vụ, chi nhánh, gói rửa xe
- Giúp khách đặt lịch rửa xe (khi đã đăng nhập)
- Kiểm tra khung giờ còn trống

Quy tắc quan trọng:
- Trả lời bằng ngôn ngữ khách đang dùng (Việt/Anh/bất kỳ ngôn ngữ nào)
- Tự hiểu ý dù khách viết sai chính tả hoặc viết tắt
- Khi đặt lịch: hỏi lần lượt chi nhánh → gói dịch vụ → ngày → giờ → xe → xác nhận
- Chỉ gọi create_booking sau khi khách xác nhận đầy đủ thông tin
- Nếu isLoggedIn = false: chỉ tư vấn, không đặt lịch được (yêu cầu đăng nhập trước)
- Giá định dạng VNĐ (ví dụ: 150.000đ)
- Thân thiện, ngắn gọn, chuyên nghiệp`;

const toolDeclarations = [
  {
    name: 'get_branches',
    description: 'Lấy danh sách tất cả chi nhánh AutoWashPro đang hoạt động',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_packages',
    description: 'Lấy danh sách gói dịch vụ rửa xe của một chi nhánh',
    parameters: {
      type: 'object',
      properties: {
        branchId: { type: 'string', description: 'ID của chi nhánh' },
      },
      required: ['branchId'],
    },
  },
  {
    name: 'check_availability',
    description: 'Kiểm tra khung giờ còn trống tại chi nhánh vào một ngày cụ thể với gói dịch vụ đã chọn',
    parameters: {
      type: 'object',
      properties: {
        branchId: { type: 'string', description: 'ID chi nhánh' },
        packageId: { type: 'string', description: 'ID gói dịch vụ' },
        date: { type: 'string', description: 'Ngày kiểm tra định dạng YYYY-MM-DD' },
      },
      required: ['branchId', 'packageId', 'date'],
    },
  },
  {
    name: 'get_user_vehicles',
    description: 'Lấy danh sách xe của người dùng đang đăng nhập để chọn xe khi đặt lịch',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_booking',
    description: 'Tạo lịch đặt rửa xe cho người dùng sau khi đã xác nhận đầy đủ thông tin',
    parameters: {
      type: 'object',
      properties: {
        branchId: { type: 'string', description: 'ID chi nhánh' },
        packageId: { type: 'string', description: 'ID gói dịch vụ' },
        vehicleId: { type: 'string', description: 'ID xe của khách hàng' },
        bookingDate: { type: 'string', description: 'Ngày đặt lịch YYYY-MM-DD' },
        startTime: { type: 'string', description: 'Giờ bắt đầu HH:mm' },
        note: { type: 'string', description: 'Ghi chú tuỳ chọn' },
      },
      required: ['branchId', 'packageId', 'vehicleId', 'bookingDate', 'startTime'],
    },
  },
];

async function executeTool(name, args, userId) {
  switch (name) {
    case 'get_branches': {
      const branches = await branchService.getAllBranches({ status: 'active' });
      return branches.map(b => ({
        id: String(b._id),
        name: b.name,
        address: b.address,
        phone: b.phone || '',
        openingTime: b.openingTime || '07:00',
        closingTime: b.closingTime || '20:00',
      }));
    }

    case 'get_packages': {
      const pkgs = await packageService.getAllPackages({ branchId: args.branchId, status: 'active' });
      return pkgs.map(p => ({
        id: String(p._id),
        name: p.name,
        price: p.price,
        duration: p.duration,
        description: p.description || '',
      }));
    }

    case 'check_availability': {
      const slots = await bookingService.getAvailableSlots(args.branchId, args.date, args.packageId);
      const available = slots.filter(s => s.available);
      if (available.length === 0) return { message: 'Không còn khung giờ trống trong ngày này' };
      return available.map(s => ({ startTime: s.startTime, endTime: s.endTime, vipOnly: !!s.vipOnly }));
    }

    case 'get_user_vehicles': {
      if (!userId) return { error: 'Chưa đăng nhập' };
      const vehicles = await Vehicle.find({ userId });
      if (!vehicles.length) return { message: 'Bạn chưa có xe nào. Vui lòng thêm xe trong hồ sơ trước.' };
      return vehicles.map(v => ({
        id: String(v._id),
        licensePlate: v.licensePlate,
        vehicleType: v.vehicleType,
        brand: v.brand || '',
        color: v.color || '',
      }));
    }

    case 'create_booking': {
      if (!userId) return { error: 'Bạn cần đăng nhập để đặt lịch' };
      const booking = await bookingService.createBooking({ ...args, userId });
      return {
        success: true,
        bookingId: String(booking._id),
        startTime: booking.startTime,
        endTime: booking.endTime,
        date: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
        finalPrice: booking.finalPrice,
      };
    }

    default:
      return { error: `Công cụ không tồn tại: ${name}` };
  }
}

exports.chat = async (sessionId, message, userId) => {
  if (!process.env.GOOGLE_AI_KEY) {
    throw Object.assign(
      new Error('Chatbot chưa được cấu hình. Vui lòng thêm GOOGLE_AI_KEY vào file .env'),
      { statusCode: 503 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY });
  const session = getSession(sessionId);

  // Prepend login context only for the first message
  const userText = session.history.length === 0
    ? `[isLoggedIn: ${!!userId}]\n${message}`
    : message;

  session.history.push({ role: 'user', parts: [{ text: userText }] });

  for (let i = 0; i < 6; i++) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: session.history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const functionCalls = response.functionCalls;
    const modelParts = response.candidates?.[0]?.content?.parts || [];

    if (!functionCalls || functionCalls.length === 0) {
      const text = (response.text || '').trim();
      session.history.push({ role: 'model', parts: modelParts.length ? modelParts : [{ text }] });
      return { reply: text || 'Xin lỗi, không nhận được phản hồi.' };
    }

    // Add model turn (with function call parts) to history
    session.history.push({ role: 'model', parts: modelParts });

    // Execute each tool and collect responses
    const functionResponses = [];
    for (const fc of functionCalls) {
      const result = await executeTool(fc.name, fc.args || {}, userId).catch(err => ({ error: err.message }));
      functionResponses.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    session.history.push({ role: 'user', parts: functionResponses });
  }

  return { reply: 'Xin lỗi, đã xảy ra lỗi xử lý. Vui lòng thử lại.' };
};

exports.clearSession = (sessionId) => sessions.delete(sessionId);
