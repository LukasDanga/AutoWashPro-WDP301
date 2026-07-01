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
  ArrowUUpLeft,
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
    label: 'Voucher',
    to: '/manager/vouchers',
    icon: Tag,
  },
  {
    id: 'refund-requests',
    label: 'Yêu cầu hoàn tiền',
    to: '/manager/refund-requests',
    icon: ArrowUUpLeft,
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
    title: 'Quản lý voucher',
    description: 'Tạo và quản lý mã giảm giá áp dụng tại chi nhánh.',
  },
  'refund-requests': {
    title: 'Yêu cầu hoàn tiền',
    description: 'Xem xét và duyệt các yêu cầu hoàn tiền do khách hàng gửi.',
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
