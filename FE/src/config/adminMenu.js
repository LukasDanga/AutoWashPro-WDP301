import {
  Buildings,
  ChartLine,
  ClockCounterClockwise,
  Gift,
  Star,
  UserCircle,
  Users,
  CalendarBlank,
  Ticket,
  CurrencyDollar,
  ArrowUUpLeft,
  Gear,
} from '@phosphor-icons/react';

export const ADMIN_BRAND = {
  name: 'AutoWash Pro',
  tagline: 'Bảng điều khiển quản trị',
};

export const ADMIN_MENU_ITEMS = [
  {
    id: 'overview',
    label: 'Giám sát tổng quan',
    to: '/admin',
    icon: ChartLine,
    end: true,
  },
  {
    id: 'branches',
    label: 'Quản lý chi nhánh',
    to: '/admin/branches',
    icon: Buildings,
  },
  {
    id: 'users',
    label: 'Quản lý người dùng',
    to: '/admin/users',
    icon: Users,
  },
  {
    id: 'reviews',
    label: 'Đánh giá',
    to: '/admin/reviews',
    icon: Star,
  },
  {
    id: 'rewards',
    label: 'Khuyến mãi & Quà tặng',
    to: '/admin/rewards',
    icon: Gift,
  },
  {
    id: 'activity',
    label: 'Hoạt động gần đây',
    to: '/admin/activity',
    icon: ClockCounterClockwise,
  },
  {
    id: 'bookings',
    label: 'Quản lý đặt lịch',
    to: '/admin/bookings',
    icon: CalendarBlank,
  },
  {
    id: 'system-config',
    label: 'Cấu hình hệ thống',
    to: '/admin/system-config',
    icon: Gear,
  },
  {
    id: 'payments',
    label: 'Quản lý thanh toán',
    to: '/admin/payments',
    icon: CurrencyDollar,
  },
  {
    id: 'refund-requests',
    label: 'Yêu cầu hoàn tiền',
    to: '/admin/refund-requests',
    icon: ArrowUUpLeft,
  },
  {
    id: 'slot-packs',
    label: 'Gói lượt',
    to: '/admin/slot-packs',
    icon: Ticket,
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    to: '/admin/profile',
    icon: UserCircle,
  },
];

export const ADMIN_PAGE_META = {
  overview: {
    title: 'Giám sát tổng quan',
    description: 'Theo dõi hoạt động hệ thống rửa xe theo thời gian thực.',
  },
  branches: {
    title: 'Quản lý chi nhánh',
    description: 'Xem, thêm, sửa và quản lý trạng thái các chi nhánh rửa xe.',
  },
  users: {
    title: 'Quản lý người dùng',
    description: 'Quản lý tài khoản khách hàng, nhân viên và phân quyền.',
  },
  reviews: {
    title: 'Đánh giá của khách hàng',
    description: 'Xem và phản hồi phản hồi từ khách hàng sau mỗi lượt rửa.',
  },
  rewards: {
    title: 'Khuyến mãi & Quà tặng',
    description: 'Cấu hình chương trình tích điểm và đổi quà.',
  },
  'rewards/config': {
    title: 'Cấu hình tích điểm & Hạng thành viên',
    description: 'Tùy chỉnh tỷ lệ tích điểm cơ bản và các mốc thăng hạng thành viên.',
  },
  activity: {
    title: 'Hoạt động gần đây',
    description: 'Dòng thời gian các sự kiện đặt lịch, hoàn thành, hủy và đánh giá.',
  },
  bookings: {
    title: 'Quản lý đặt lịch',
    description: 'Xem và quản lý toàn bộ đặt lịch trên tất cả chi nhánh.',
  },
  payments: {
    title: 'Quản lý thanh toán',
    description: 'Xem và quản lý toàn bộ giao dịch thanh toán trên hệ thống.',
  },
  'refund-requests': {
    title: 'Yêu cầu hoàn tiền',
    description: 'Xem xét và duyệt các yêu cầu hoàn tiền do khách hàng gửi trên toàn hệ thống.',
  },
  'slot-packs': {
    title: 'Gói lượt',
    description: 'Quản lý tất cả gói lượt trên toàn hệ thống.',
  },
  profile: {
    title: 'Hồ sơ',
    description: 'Thông tin tài khoản quản trị viên.',
  },
};
