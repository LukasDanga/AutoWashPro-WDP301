import {
  CalendarCheck,
  ChartPieSlice,
  ClipboardText,
  Buildings,
  Tag,
  UserCircle,
  CurrencyCircleDollar,
  Star,
  Users,
  Package,
  Ticket,
  CalendarBlank,
  CurrencyDollar,
} from '@phosphor-icons/react';

export const MANAGER_BRAND = {
  name: 'AutoWash Pro',
  tagline: 'Quản lý chi nhánh',
};

export const MANAGER_MENU_ITEMS = [
  {
    id: 'overview',
    label: 'Tổng quan',
    to: '/manager',
    icon: ChartPieSlice,
    end: true,
  },
  {
    id: 'bookings',
    label: 'Đặt lịch',
    to: '/manager/bookings',
    icon: CalendarCheck,
  },
  {
    id: 'schedule',
    label: 'Lịch theo ngày',
    to: '/manager/schedule',
    icon: CalendarBlank,
  },

  {
    id: 'branch',
    label: 'Chi nhánh của tôi',
    to: '/manager/branch',
    icon: Buildings,
  },
  {
    id: 'revenue',
    label: 'Doanh thu',
    to: '/manager/revenue',
    icon: CurrencyCircleDollar,
  },
  {
    id: 'vouchers',
    label: 'Khuyến mãi & Quà tặng',
    to: '/manager/vouchers',
    icon: Tag,
  },
  {
    id: 'payments',
    label: 'Quản lý thanh toán',
    to: '/manager/payments',
    icon: CurrencyDollar,
  },
  {
    id: 'customers',
    label: 'Khách hàng',
    to: '/manager/customers',
    icon: Users,
  },
  {
    id: 'packages',
    label: 'Gói dịch vụ',
    to: '/manager/packages',
    icon: Package,
  },
  {
    id: 'slot-packs',
    label: 'Gói lượt',
    to: '/manager/slot-packs',
    icon: Ticket,
  },
  {
    id: 'feedbacks',
    label: 'Đánh giá',
    to: '/manager/feedbacks',
    icon: Star,
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    to: '/manager/profile',
    icon: UserCircle,
  },
];

export const MANAGER_PAGE_META = {
  overview: {
    title: 'Tổng quan chi nhánh',
    description: 'Theo dõi hoạt động hôm nay và các chỉ số quan trọng.',
  },
  bookings: {
    title: 'Quản lý đặt lịch',
    description: 'Xem và cập nhật trạng thái các lịch đặt trong chi nhánh.',
  },

  schedule: {
    title: 'Lịch theo ngày',
    description: 'Xem toàn bộ slot trong ngày dạng timeline — ai đặt giờ nào, còn trống không.',
  },
  branch: {
    title: 'Chi nhánh của tôi',
    description: 'Xem và chỉnh sửa thông tin chi nhánh bạn phụ trách.',
  },
  vouchers: {
    title: 'Khuyến mãi & Quà tặng',
    description: 'Quản lý voucher giảm giá, lịch sử điểm thưởng, vòng quay may mắn.',
  },
  payments: {
    title: 'Quản lý thanh toán',
    description: 'Theo dõi và quản lý các giao dịch thanh toán tại chi nhánh của bạn.',
  },
  'refund-requests': {
    title: 'Quản lý thanh toán — Yêu cầu hoàn tiền',
    description: 'Xem xét và duyệt các yêu cầu hoàn tiền do khách hàng gửi tại chi nhánh của bạn.',
  },
  customers: {
    title: 'Quản lý khách hàng',
    description: 'Danh sách khách hàng đã sử dụng dịch vụ tại chi nhánh.',
  },
  feedbacks: {
    title: 'Đánh giá từ khách hàng',
    description: 'Phản hồi và đánh giá chất lượng dịch vụ của chi nhánh.',
  },
  revenue: {
    title: 'Báo cáo doanh thu',
    description: 'Thống kê doanh thu theo thời gian, dịch vụ và khách hàng.',
  },
  packages: {
    title: 'Gói dịch vụ',
    description: 'Tạo và quản lý gói dịch vụ rửa xe tại chi nhánh.',
  },
  'slot-packs': {
    title: 'Gói lượt',
    description: 'Quản lý gói lượt rửa xe đã mua và tra cứu theo mã.',
  },
  profile: {
    title: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản quản lý chi nhánh.',
  },
};
