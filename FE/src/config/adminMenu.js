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
    label: 'Đánh giá của khách hàng',
    to: '/admin/reviews',
    icon: Star,
  },
  {
    id: 'rewards',
    label: 'Quản lý điểm thưởng',
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
    title: 'Quản lý điểm thưởng',
    description: 'Cấu hình chương trình tích điểm và đổi quà.',
  },
  activity: {
    title: 'Hoạt động gần đây',
    description: 'Dòng thời gian các sự kiện đặt lịch, hoàn thành, hủy và đánh giá.',
  },
  bookings: {
    title: 'Quản lý đặt lịch',
    description: 'Xem và quản lý toàn bộ đặt lịch trên tất cả chi nhánh.',
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
