const Policy = require('../models/policy.schema');

const DEFAULT_POLICIES = [
  // --- POLICIES ---
  {
    slug: 'privacy',
    category: 'policy',
    title: 'Chính sách bảo mật',
    icon: '🔒',
    shortDescription: 'Cam kết bảo vệ thông tin cá nhân và tài khoản của khách hàng.',
    order: 1,
    isActive: true,
    sections: [
      {
        subtitle: '1. Mục đích và phạm vi thu thập thông tin',
        body: 'AutoWashPro thu thập thông tin cá nhân của khách hàng bao gồm: họ tên, email, số điện thoại, biển số xe, địa chỉ và thông tin thanh toán. Các thông tin này chỉ được thu thập khi khách hàng tự nguyện đăng ký tài khoản, đặt lịch rửa xe hoặc sử dụng các dịch vụ trên hệ thống.'
      },
      {
        subtitle: '2. Phạm vi sử dụng thông tin',
        body: 'Thông tin cá nhân thu thập được chỉ sử dụng trong nội bộ AutoWashPro với các mục đích: xác nhận và quản lý lịch hẹn, hỗ trợ khách hàng, gửi thông báo về lịch hẹn và khuyến mãi, nâng cao chất lượng dịch vụ.'
      },
      {
        subtitle: '3. Thời gian lưu trữ thông tin',
        body: 'AutoWashPro lưu trữ thông tin cá nhân của khách hàng trong suốt thời gian tài khoản còn hoạt động. Khách hàng có quyền yêu cầu xóa tài khoản và thông tin cá nhân bất cứ lúc nào bằng cách liên hệ bộ phận hỗ trợ.'
      },
      {
        subtitle: '4. Cam kết bảo mật',
        body: 'AutoWashPro cam kết bảo vệ thông tin cá nhân của khách hàng bằng các biện pháp kỹ thuật và quản lý. Hệ thống sử dụng mã hóa SSL/TLS cho toàn bộ dữ liệu truyền tải và mã hóa mật khẩu bằng công nghệ bcrypt.'
      },
      {
        subtitle: '5. Chia sẻ thông tin với bên thứ ba',
        body: 'AutoWashPro không bán, chia sẻ hoặc tiết lộ thông tin cá nhân của khách hàng cho bên thứ ba ngoại trừ các trường hợp: có sự đồng ý của khách hàng, theo yêu cầu của cơ quan pháp luật, hoặc đối tác thanh toán (VNPay, MoMo) phục vụ xử lý giao dịch.'
      }
    ]
  },
  {
    slug: 'terms',
    category: 'policy',
    title: 'Điều khoản sử dụng',
    icon: '📋',
    shortDescription: 'Quy định và nghĩa vụ đối với khách hàng khi sử dụng dịch vụ.',
    order: 2,
    isActive: true,
    sections: [
      {
        subtitle: '1. Chấp nhận điều khoản',
        body: 'Bằng việc truy cập và sử dụng hệ thống AutoWashPro, khách hàng xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản được quy định trong tài liệu này.'
      },
      {
        subtitle: '2. Tài khoản người dùng',
        body: 'Khách hàng có trách nhiệm bảo mật thông tin tài khoản và mật khẩu. Mọi hoạt động diễn ra trên tài khoản đều được xem là do khách hàng thực hiện. AutoWashPro không chịu trách nhiệm cho các tổn thất phát sinh từ việc truy cập trái phép.'
      },
      {
        subtitle: '3. Quyền và nghĩa vụ của khách hàng',
        body: 'Khách hàng có quyền đặt lịch, hủy lịch, đánh giá dịch vụ và tham gia chương trình khách hàng thân thiết. Khách hàng có nghĩa vụ cung cấp thông tin chính xác, đến đúng giờ hẹn và tuân thủ nội quy của chi nhánh.'
      },
      {
        subtitle: '4. Quyền và nghĩa vụ của AutoWashPro',
        body: 'AutoWashPro có quyền từ chối phục vụ nếu khách hàng vi phạm điều khoản. Chúng tôi cam kết cung cấp dịch vụ đúng với mô tả và chịu trách nhiệm nếu dịch vụ không đạt chất lượng.'
      },
      {
        subtitle: '5. Sửa đổi điều khoản',
        body: 'AutoWashPro có quyền sửa đổi các điều khoản sử dụng bất cứ lúc nào. Các thay đổi sẽ được thông báo trên hệ thống. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi được xem là chấp nhận điều khoản mới.'
      }
    ]
  },
  {
    slug: 'payment',
    category: 'policy',
    title: 'Chính sách thanh toán',
    icon: '💳',
    shortDescription: 'Quy định thanh toán trực tuyến qua VNPay, MoMo, Ví nội bộ và tiền mặt.',
    order: 3,
    isActive: true,
    sections: [
      {
        subtitle: '1. Hình thức thanh toán',
        body: 'AutoWashPro chấp nhận các hình thức thanh toán sau: tiền mặt tại chi nhánh, chuyển khoản ngân hàng, thanh toán trực tuyến qua VNPay, MoMo và Ví điện tử AutoWash.'
      },
      {
        subtitle: '2. Thanh toán đặt cọc',
        body: 'Một số gói dịch vụ yêu cầu đặt cọc tối thiểu theo tỷ lệ quy định khi đặt lịch trực tuyến. Khoản cọc sẽ được khấu trừ tự động vào tổng số tiền khi khách hàng hoàn tất dịch vụ tại chi nhánh.'
      },
      {
        subtitle: '3. Thanh toán trực tuyến',
        body: 'Thanh toán trực tuyến qua VNPay/MoMo được xử lý ngay lập tức. Giao dịch thành công sẽ được xác nhận và cập nhật trạng thái thanh toán tự động trong hệ thống.'
      },
      {
        subtitle: '4. Hóa đơn và chứng từ',
        body: 'Hóa đơn điện tử được gửi qua email sau khi giao dịch hoàn tất. Khách hàng có nhu cầu lấy hóa đơn VAT vui lòng liên hệ bộ phận hỗ trợ và cung cấp mã số thuế trước khi thanh toán.'
      },
      {
        subtitle: '5. Bảo mật thông tin thanh toán',
        body: 'Mọi giao dịch thanh toán được bảo mật qua cổng thanh toán chuẩn PCI DSS. AutoWashPro không lưu trữ thông tin thẻ tín dụng hoặc mật khẩu tài khoản ngân hàng của khách hàng.'
      }
    ]
  },
  {
    slug: 'cancellation',
    category: 'policy',
    title: 'Chính sách hủy lịch',
    icon: '❌',
    shortDescription: 'Điều kiện hủy lịch hẹn và xử lý khách trễ giờ / không đến (No-show).',
    order: 4,
    isActive: true,
    sections: [
      {
        subtitle: '1. Hủy lịch trước giờ hẹn',
        body: 'Khách hàng có thể hủy lịch hẹn trước tối thiểu 2 giờ so với giờ bắt đầu mà không mất phí. Việc hủy lịch được thực hiện trực tiếp trên hệ thống qua mục "Lịch sử đặt xe".'
      },
      {
        subtitle: '2. Hủy lịch muộn (dưới 2 giờ)',
        body: 'Trong trường hợp hủy lịch dưới 2 giờ trước giờ hẹn, khoản tiền cọc (nếu có) sẽ không được hoàn lại. Khách hàng vui lòng liên hệ trực tiếp chi nhánh để được hỗ trợ chuyển khung giờ.'
      },
      {
        subtitle: '3. Không đến (No-show)',
        body: 'Nếu khách hàng không đến sau 30 phút kể từ giờ hẹn, lịch hẹn sẽ tự động bị hủy bởi hệ thống (Auto-cancel cron job). Tiền cọc sẽ không được hoàn lại và khách hàng sẽ bị ghi nhận lượt vắng mặt.'
      },
      {
        subtitle: '4. Hủy lịch do chi nhánh',
        body: 'Trong trường hợp chi nhánh phải hủy lịch hẹn vì lý do bất khả kháng (mất điện, hỏng thiết bị, sự cố kỹ thuật), AutoWashPro sẽ thông báo sớm nhất có thể và hoàn tiền 100% vào Ví AutoWash hoặc hỗ trợ xếp lịch ưu tiên.'
      },
      {
        subtitle: '5. Giới hạn số lần hủy',
        body: 'Khách hàng hủy lịch nhiều lần (từ 5 lần trở lên trong một tháng) có thể bị giới hạn quyền đặt lịch trước hoặc yêu cầu đặt cọc 100% cho các lần đặt sau.'
      }
    ]
  },
  {
    slug: 'refund',
    category: 'policy',
    title: 'Chính sách hoàn tiền',
    icon: '🔙',
    shortDescription: 'Quy trình và điều kiện hoàn tiền vào Ví AutoWash.',
    order: 5,
    isActive: true,
    sections: [
      {
        subtitle: '1. Điều kiện hoàn tiền',
        body: 'Khách hàng được hoàn tiền tự động vào Ví AutoWash khi hủy đơn đúng quy định hoặc khi chi nhánh hủy đơn. Đối với đơn đã hoàn thành, khách hàng có thể gửi yêu cầu hoàn tiền trong vòng 24h nếu dịch vụ không đạt chất lượng cam kết.'
      },
      {
        subtitle: '2. Quy trình hoàn tiền',
        body: 'Hủy đơn hợp lệ: tiền được hoàn tự động vào Ví AutoWash ngay lập tức. Hoàn tiền sau hoàn thành: khách hàng gửi yêu cầu qua ứng dụng, Admin thẩm định và xử lý trong 24h.'
      },
      {
        subtitle: '3. Phương thức hoàn tiền',
        body: 'Toàn bộ tiền hoàn được chuyển trực tiếp vào Ví AutoWash của khách hàng, có thể sử dụng ngay cho các lần đặt lịch hoặc mua gói lượt tiếp theo.'
      },
      {
        subtitle: '4. Hoàn tiền cho gói lượt (Slot Pack)',
        body: 'Gói lượt chưa sử dụng hết có thể được yêu cầu hoàn tiền với giá trị tương ứng số lượt còn lại, sau khi trừ phí quản lý 10%. Yêu cầu áp dụng trong vòng 30 ngày kể từ ngày mua.'
      }
    ]
  },
  {
    slug: 'insurance',
    category: 'policy',
    title: 'Chính sách bảo hiểm & bồi thường',
    icon: '🤝',
    shortDescription: 'Cam kết bồi thường rủi ro trầy xước, hư hỏng cho cả dòng xe thường và xe sang.',
    order: 6,
    isActive: true,
    sections: [
      {
        subtitle: '1. Phạm vi bảo hiểm',
        body: 'AutoWashPro áp dụng bảo hiểm trách nhiệm dịch vụ cho toàn bộ quy trình rửa xe tại tất cả chi nhánh. Bảo hiểm này chi trả trong trường hợp xe của khách hàng bị trầy xước, móp méo hoặc hư hỏng ngoại thất phát sinh trực tiếp từ quy trình rửa xe.'
      },
      {
        subtitle: '2. Quy trình kiểm tra xe trước khi rửa',
        body: 'Trước khi tiến hành rửa, nhân viên chi nhánh và khách hàng sẽ cùng kiểm tra tình trạng xe hiện tại. Mọi vết trầy xước hoặc hư hỏng có sẵn sẽ được ghi nhận bằng hình ảnh trên ứng dụng.'
      },
      {
        subtitle: '3. Quy trình xử lý khi có sự cố',
        body: 'Ngay khi phát hiện hư hỏng, khách hàng thông báo cho quản lý chi nhánh trong vòng 24 giờ. AutoWashPro sẽ lập biên bản ghi nhận, chụp ảnh hiện trường và đưa xe đến garage uy tín thống nhất sửa chữa.'
      },
      {
        subtitle: '4. Mức bồi thường',
        body: 'AutoWashPro cam kết bồi thường 100% chi phí sửa chữa khắc phục tại garage uy tín do hai bên thống nhất. Mức bồi thường tối đa cho mỗi sự cố tiêu chuẩn là 50.000.000đ.'
      },
      {
        subtitle: '5. Xử lý xe sang, xe đắt tiền',
        body: 'Đối với các dòng xe sang (Mercedes, BMW, Audi, Porsche, Lexus, Rolls-Royce, Bentley...), AutoWashPro áp dụng quy trình rửa tay chuyên biệt tại khu vực VIP. Hạn mức bồi thường tối đa cho xe sang có thể lên đến 200.000.000đ mỗi sự cố.'
      }
    ]
  },
  {
    slug: 'booking',
    category: 'policy',
    title: 'Chính sách đặt lịch',
    icon: '📅',
    shortDescription: 'Hướng dẫn quy trình đặt lịch đơn, định kỳ và check-in bằng mã QR.',
    order: 7,
    isActive: true,
    sections: [
      {
        subtitle: '1. Quy trình đặt lịch',
        body: 'Khách hàng chọn chi nhánh, gói dịch vụ, thời gian và phương tiện. Hệ thống kiểm tra slot trống và xác nhận lịch hẹn kèm mã QR Check-in.'
      },
      {
        subtitle: '2. Thời gian đặt lịch',
        body: 'Khách hàng có thể đặt lịch trước tối thiểu 15-30 phút và tối đa 30 ngày so với thời điểm hiện tại. Mỗi khung giờ được chia thành các slot 30 phút để tối ưu phục vụ.'
      },
      {
        subtitle: '3. Check-in và Check-out',
        body: 'Khi đến chi nhánh, khách hàng xuất trình mã QR trên ứng dụng để Manager quét check-in. Khi rửa xong, nhân viên quét check-out hoàn tất dịch vụ.'
      },
      {
        subtitle: '4. Lịch hẹn định kỳ',
        body: 'Khách hàng có thể thiết lập lịch rửa xe định kỳ lặp lại hàng tuần. Hệ thống tự động đặt slot trước cho khách hàng.'
      },
      {
        subtitle: '5. Ưu tiên xếp lịch',
        body: 'Khách hàng thân thiết ở các hạng Bạc, Vàng, Kim Cương được hệ thống tự động ưu tiên xếp slot trong các khung giờ cao điểm.'
      }
    ]
  },
  {
    slug: 'loyalty',
    category: 'policy',
    title: 'Chính sách khách hàng thân thiết',
    icon: '⭐',
    shortDescription: 'Tích điểm, phân hạng thành viên Bronze -> Diamond và ưu đãi mua Gói lượt prepaid.',
    order: 8,
    isActive: true,
    sections: [
      {
        subtitle: '1. Hạng thành viên',
        body: 'AutoWashPro gồm 4 hạng thành viên: Bronze (Đồng), Silver (Bạc), Gold (Vàng), và Diamond (Kim Cương) dựa trên điểm tích lũy.'
      },
      {
        subtitle: '2. Tích điểm thưởng',
        body: 'Mỗi 10.000đ chi tiêu dịch vụ tương ứng 1 điểm tích lũy. Điểm được tự động cộng vào tài khoản sau khi hoàn thành đơn rửa xe và có thời hạn 12 tháng.'
      },
      {
        subtitle: '3. Quyền lợi theo hạng',
        body: 'Hạng Bạc giảm 5%, hạng Vàng giảm 10%, hạng Kim Cương giảm 15% khi mua gói slot prepaid. Khách Vàng & Kim Cương được hỗ trợ ưu tiên.'
      },
      {
        subtitle: '4. Đổi quà & Voucher',
        body: 'Khách hàng có thể đổi điểm thưởng lấy mã giảm giá hoặc quà tặng độc quyền tại Cửa hàng quà tặng trên ứng dụng.'
      }
    ]
  },
  {
    slug: 'data-protection',
    category: 'policy',
    title: 'Chính sách bảo vệ dữ liệu cá nhân',
    icon: '🛡️',
    shortDescription: 'Tuân thủ các nguyên tắc mã hóa và bảo mật dữ liệu khách hàng.',
    order: 9,
    isActive: true,
    sections: [
      {
        subtitle: '1. Nguyên tắc xử lý dữ liệu',
        body: 'AutoWashPro tuân thủ các nguyên tắc: thu thập dữ liệu tối thiểu, minh bạch mục đích sử dụng, bảo mật tuyệt đối dữ liệu cá nhân khách hàng.'
      },
      {
        subtitle: '2. Quyền của khách hàng',
        body: 'Khách hàng có quyền truy cập, chỉnh sửa, yêu cầu xuất hoặc xóa thông tin cá nhân của mình trên hệ thống bất kỳ lúc nào.'
      },
      {
        subtitle: '3. Bảo vệ kỹ thuật',
        body: 'Dữ liệu được bảo vệ bằng tường lửa, mã hóa SSL/TLS, JWT authentication và kiểm soát truy cập phân quyền nghiêm ngặt.'
      }
    ]
  },

  // --- FEATURED SERVICES ---
  {
    slug: 'foaming-wash',
    category: 'featured_service',
    title: 'Rửa xe bọt tuyết cao cấp',
    icon: '🧽',
    shortDescription: 'Sử dụng dung dịch bọt tuyết trung tính Ph7 bảo vệ lớp sơn bóng nguyên bản.',
    order: 1,
    isActive: true,
    linkUrl: '/#services',
    sections: [
      {
        subtitle: 'Mô tả dịch vụ',
        body: 'Quy trình rửa xe bọt tuyết 7 bước tiêu chuẩn, làm sạch toàn bộ thân xe, hốc bánh, mâm xe và gầm xe với dung dịch bọt tuyết sinh học nhập khẩu.'
      }
    ]
  },
  {
    slug: 'engine-cleaning',
    category: 'featured_service',
    title: 'Rửa khoang máy chi tiết',
    icon: '🚗',
    shortDescription: 'Làm sạch bụi bẩn, dầu mỡ khoang động cơ bằng hơi nước nóng an toàn.',
    order: 2,
    isActive: true,
    linkUrl: '/#services',
    sections: [
      {
        subtitle: 'Mô tả dịch vụ',
        body: 'Vệ sinh khoang máy bằng công nghệ hơi nước nóng kết hợp dung dịch dưỡng chi tiết nhựa/cao su, giúp tản nhiệt tốt hơn và phòng ngừa chuột cắn.'
      }
    ]
  },
  {
    slug: 'ceramic-coating',
    category: 'featured_service',
    title: 'Phủ bóng Ceramic Nano',
    icon: '✨',
    shortDescription: 'Tạo lớp bảo vệ sơn chống trầy xước nhẹ, kháng nước và chống tia UV.',
    order: 3,
    isActive: true,
    linkUrl: '/#services',
    sections: [
      {
        subtitle: 'Mô tả dịch vụ',
        body: 'Phủ hợp chất Ceramic độ cứng 9H giúp bề mặt sơn xe luôn sáng bóng như mới, hiệu ứng lá sen kháng nước mưa axit và bụi bẩn vượt trội.'
      }
    ]
  },
  {
    slug: 'interior-disinfection',
    category: 'featured_service',
    title: 'Vệ sinh nội thất khử khuẩn',
    icon: '🧼',
    shortDescription: 'Dọn sạch khoang cabin, khử mùi hôi và diệt 99.9% vi khuẩn bằng Ozone.',
    order: 4,
    isActive: true,
    linkUrl: '/#services',
    sections: [
      {
        subtitle: 'Mô tả dịch vụ',
        body: 'Giặt ghế da/nỉ, dưỡng bề mặt taplo, hút bụi thảm lót sàn và chạy máy khử trùng Ozone mang lại không khí trong lành dễ chịu cho người ngồi trên xe.'
      }
    ]
  },
  {
    slug: 'paint-polishing',
    category: 'featured_service',
    title: 'Đánh bóng & Khôi phục sơn',
    icon: '🛠️',
    shortDescription: 'Xóa vết xoáy quầng, vết xước dăm và phục hồi độ sâu màu sơn.',
    order: 5,
    isActive: true,
    linkUrl: '/#services',
    sections: [
      {
        subtitle: 'Mô tả dịch vụ',
        body: 'Hiệu chỉnh bề mặt sơn 3 bước bằng máy đánh bóng đồng tâm chuyên dụng, xử lý triệt để vết xước dăm và khôi phục độ bóng ban đầu của xe.'
      }
    ]
  }
];

class PolicyService {
  async getAllPolicies(query = {}) {
    const { category, isActive, all } = query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (all !== 'true' && all !== true) {
      filter.isActive = isActive !== undefined ? isActive === 'true' || isActive === true : true;
    }

    return await Policy.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('updatedBy', 'name email role');
  }

  async getPolicyBySlug(slug) {
    return await Policy.findOne({ slug })
      .populate('updatedBy', 'name email role');
  }

  async getPolicyById(id) {
    return await Policy.findById(id)
      .populate('updatedBy', 'name email role');
  }

  async createPolicy(data, userId) {
    const payload = {
      ...data,
      updatedBy: userId
    };
    if (payload.slug) {
      payload.slug = payload.slug.trim().toLowerCase();
    }
    return await Policy.create(payload);
  }

  async updatePolicy(id, data, userId) {
    const payload = {
      ...data,
      updatedBy: userId
    };
    if (payload.slug) {
      payload.slug = payload.slug.trim().toLowerCase();
    }

    const updated = await Policy.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    }).populate('updatedBy', 'name email role');

    return updated;
  }

  async deletePolicy(id) {
    return await Policy.findByIdAndDelete(id);
  }

  async seedDefaultPolicies(force = false) {
    const count = await Policy.countDocuments();
    if (count > 0 && !force) {
      return { seeded: false, message: 'Dữ liệu chính sách đã tồn tại.', count };
    }

    if (force) {
      await Policy.deleteMany({});
    }

    await Policy.insertMany(DEFAULT_POLICIES);
    const newCount = await Policy.countDocuments();

    return {
      seeded: true,
      message: 'Khởi tạo dữ liệu mẫu chính sách thành công!',
      count: newCount
    };
  }
}

module.exports = new PolicyService();
