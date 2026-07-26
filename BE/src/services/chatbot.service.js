const { OpenAI } = require('openai');
const branchService = require('./branch.service');
const packageService = require('./package.service');
const bookingService = require('./booking.service');
const { Vehicle } = require('../models');

// ─── Singleton OpenAI client (khởi tạo 1 lần, tái dùng mọi request) ───────────
let _openai = null;
let _modelName = null;

function getOpenAI() {
  if (!_openai) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      throw Object.assign(
        new Error('Chatbot chưa được cấu hình. Vui lòng thêm OPENROUTER_API_KEY vào file .env'),
        { statusCode: 503 }
      );
    }
    _openai = new OpenAI({
      apiKey,
      baseURL: process.env.CHATBOT_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
        'X-Title': 'AutoWashPro',
      },
    });
    _modelName = process.env.CHATBOT_MODEL || 'google/gemini-2.5-flash';
  }
  return { openai: _openai, modelName: _modelName };
}

// ─── Session management ────────────────────────────────────────────────────────
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

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI của AutoWashPro - hệ thống đặt lịch rửa xe thông minh. Nhiệm vụ của bạn là hỗ trợ khách hàng về dịch vụ của AutoWashPro.

=== KIẾN THỨC VỀ AUTOWASHPRO ===

AutoWashPro là nền tảng đặt lịch rửa xe trực tuyến với các tính năng:
- Đặt lịch rửa xe trực tuyến (single, recurring, slot pack)
- Thanh toán: Tiền mặt, chuyển khoản, VNPay, MoMo
- Tích điểm & hạng thành viên: Đồng (0-99đ), Bạc (100-499đ), Vàng (500-999đ), Kim cương (1000+đ)
- Giảm giá gói lượt theo hạng: Bạc 5%, Vàng 10%, Kim cương 15%
- Voucher giảm giá, mã sinh nhật 20%
- Kho quà tặng đổi bằng điểm
- AI Chatbot hỗ trợ 24/7
- Thông báo real-time, nhắc lịch trước 60 phút
- Tự động hủy no-show sau 5 phút quá giờ
- QR code check-in/check-out
- Xếp lịch ưu tiên theo hạng thành viên
- Hệ thống chi nhánh, gói dịch vụ đa dạng
- Chính sách bảo mật, điều khoản sử dụng, hủy lịch, hoàn tiền đầy đủ

=== GIỚI HẠN ===
Bạn CHỈ được trả lời các câu hỏi liên quan đến AutoWashPro và dịch vụ rửa xe. Nếu khách hỏi về chủ đề khác (toán, văn, lập trình, tin tức, thời tiết, sức khỏe,...), hãy lịch sự từ chối:
"Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến dịch vụ rửa xe AutoWashPro. Bạn có muốn tìm hiểu về các gói dịch vụ, đặt lịch rửa xe, hoặc các chính sách của chúng tôi không? 😊"

=== QUY TẮC HỘI THOẠI ===
- Trả lời bằng ngôn ngữ khách đang dùng (ưu tiên tiếng Việt)
- Tự hiểu ý dù khách viết sai chính tả, viết tắt, hoặc thiếu dấu
- Luôn thân thiện, dùng icon phù hợp, xưng hô "bạn", "mình"
- Câu trả lời ngắn gọn, dễ hiểu, không quá 3-4 câu nếu không cần thiết
- Luôn chủ động gợi ý bước tiếp theo để giữ cuộc trò chuyện

=== QUY TẮC ĐẶT LỊCH ===
- Hỏi lần lượt: chi nhánh → gói dịch vụ → ngày → giờ → xe → xác nhận
- Chỉ gọi create_booking sau khi khách đã xác nhận đầy đủ thông tin
- Nếu chưa đăng nhập (isLoggedIn = false): chỉ tư vấn, yêu cầu đăng nhập để đặt lịch
- Sau khi đặt thành công: báo mã booking, thời gian, chi nhánh, tổng tiền, và nhắc khách đến đúng giờ

=== ĐỊNH DẠNG ===
- Giá tiền: VNĐ (vd: 150.000đ)
- Thời gian: HH:mm
- Ngày tháng theo chuẩn Việt Nam
- Dùng icon phù hợp: 📅 💰 🚗 ✅ 🎉 ⏰ 🏪`;

// ─── Tool declarations ─────────────────────────────────────────────────────────
const openAiTools = [
  {
    type: 'function',
    function: {
      name: 'get_branches',
      description: 'Lấy danh sách tất cả chi nhánh AutoWashPro đang hoạt động',
      parameters: { type: 'object', properties: {}, required: [] },
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_packages',
      description: 'Lấy danh sách gói dịch vụ rửa xe của một chi nhánh',
      parameters: {
        type: 'object',
        properties: {
          branchId: { type: 'string', description: 'ID của chi nhánh' },
        },
        required: ['branchId'],
      },
    }
  },
  {
    type: 'function',
    function: {
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
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_vehicles',
      description: 'Lấy danh sách xe của người dùng đang đăng nhập để chọn xe khi đặt lịch',
      parameters: { type: 'object', properties: {}, required: [] },
    }
  },
  {
    type: 'function',
    function: {
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
    }
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(name, args, userId) {
  switch (name) {
    case 'get_branches': {
      const branches = await branchService.getAllBranches({ status: 'active' });
      return branches.map(b => ({
        id: String(b._id), name: b.name, address: b.address,
        phone: b.phone || '', openingTime: b.openingTime || '07:00', closingTime: b.closingTime || '20:00',
      }));
    }
    case 'get_packages': {
      const pkgs = await packageService.getAllPackages({ branchId: args.branchId, status: 'active' });
      return pkgs.map(p => ({
        id: String(p._id), name: p.name, price: p.price, duration: p.duration, description: p.description || '',
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
        id: String(v._id), licensePlate: v.licensePlate, vehicleType: v.vehicleType,
        brand: v.brand || '', color: v.color || '',
      }));
    }
    case 'create_booking': {
      if (!userId) return { error: 'Bạn cần đăng nhập để đặt lịch' };
      const booking = await bookingService.createBooking({ ...args, userId });
      return {
        success: true, bookingId: String(booking._id),
        startTime: booking.startTime, endTime: booking.endTime,
        date: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
        finalPrice: booking.finalPrice,
      };
    }
    default:
      return { error: `Công cụ không tồn tại: ${name}` };
  }
}

// ─── Error classifier ──────────────────────────────────────────────────────────
function classifyError(err) {
  const raw = err?.message || '';
  const status = err?.status || err?.code || 0;
  if (status === 429 || raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
    if (raw.includes('prepayment') || raw.includes('credits are depleted') || raw.includes('billing')) {
      return Object.assign(new Error('Dịch vụ AI tạm thời không khả dụng do hết credit.'), { statusCode: 503 });
    }
    return Object.assign(new Error('Chatbot đang bận, vui lòng thử lại sau ít giây.'), { statusCode: 429 });
  }
  if (status === 402 || raw.includes('402') || raw.includes('credits') || raw.includes('Insufficient balance')) {
    return Object.assign(new Error('Tài khoản AI đã hết credit. Vui lòng nạp thêm.'), { statusCode: 402 });
  }
  if (status === 401 || status === 403 || raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return Object.assign(new Error('Cấu hình chatbot không hợp lệ. Vui lòng liên hệ quản trị viên.'), { statusCode: 503 });
  }
  if (raw.includes('NOT_FOUND') || raw.includes('not found')) {
    return Object.assign(new Error('Model AI không tồn tại hoặc chưa được kích hoạt.'), { statusCode: 503 });
  }
  console.error('[Chatbot] Gemini API error:', raw);
  return Object.assign(new Error('Chatbot gặp sự cố. Vui lòng thử lại sau.'), { statusCode: 503 });
}

// ─── Resolve tool calls (shared between chat & stream) ────────────────────────
async function resolveToolCalls(openai, modelName, session, userId) {
  for (let i = 0; i < 5; i++) {
    const messages = [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...session.history];
    const response = await openai.chat.completions.create({
      model: modelName,
      messages,
      tools: openAiTools,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const responseMessage = response.choices?.[0]?.message;
    if (!responseMessage) return null;

    const toolCalls = responseMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls → this is the final text response
      const replyText = (responseMessage.content || '').trim();
      session.history.push({ role: 'assistant', content: replyText });
      return { done: true, reply: replyText };
    }

    // Has tool calls → execute and continue loop
    session.history.push(responseMessage);
    for (const toolCall of toolCalls) {
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}
      const result = await executeTool(toolCall.function.name, args, userId).catch(err => ({ error: err.message }));
      session.history.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result),
      });
    }
  }
  return null; // exceeded max iterations
}

// ─── Standard (non-streaming) chat ───────────────────────────────────────────
exports.chat = async (sessionId, message, userId) => {
  const { openai, modelName } = getOpenAI();
  const session = getSession(sessionId);

  const userText = session.history.length === 0
    ? `[isLoggedIn: ${!!userId}]\n${message}`
    : message;
  session.history.push({ role: 'user', content: userText });

  try {
    const result = await resolveToolCalls(openai, modelName, session, userId);
    return { reply: result?.reply || 'Xin lỗi, đã xảy ra lỗi xử lý. Vui lòng thử lại.' };
  } catch (err) {
    throw classifyError(err);
  }
};

// ─── Streaming chat (SSE) ─────────────────────────────────────────────────────
exports.streamChat = async (sessionId, message, userId, res) => {
  const { openai, modelName } = getOpenAI();
  const session = getSession(sessionId);

  const userText = session.history.length === 0
    ? `[isLoggedIn: ${!!userId}]\n${message}`
    : message;
  session.history.push({ role: 'user', content: userText });

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  try {
    // Step 1: Resolve all tool calls synchronously (non-streaming)
    for (let i = 0; i < 5; i++) {
      const messages = [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...session.history];
      const response = await openai.chat.completions.create({
        model: modelName, messages, tools: openAiTools, tool_choice: 'auto',
        max_tokens: 1024,
      });

      const responseMessage = response.choices?.[0]?.message;
      if (!responseMessage) break;

      const toolCalls = responseMessage.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls — has direct text, but we'll re-ask with stream=true below
        break;
      }

      // Notify client we're fetching data
      send({ type: 'thinking' });

      session.history.push(responseMessage);
      for (const toolCall of toolCalls) {
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}
        const result = await executeTool(toolCall.function.name, args, userId).catch(err => ({ error: err.message }));
        session.history.push({
          role: 'tool', tool_call_id: toolCall.id,
          name: toolCall.function.name, content: JSON.stringify(result),
        });
      }
    }

    // Step 2: Stream the final text response
    const finalMessages = [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...session.history];
    const stream = await openai.chat.completions.create({
      model: modelName,
      messages: finalMessages,
      stream: true,
      max_tokens: 1024,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        send({ type: 'token', token: delta });
      }
    }

    if (fullText) {
      session.history.push({ role: 'assistant', content: fullText });
    }

    send({ type: 'done' });
  } catch (err) {
    const classified = classifyError(err);
    send({ type: 'error', message: classified.message });
  } finally {
    res.end();
  }
};

exports.clearSession = (sessionId) => sessions.delete(sessionId);
