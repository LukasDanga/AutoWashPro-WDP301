import {
  ChartLine,
  ClockCounterClockwise,
  Gift,
  Star,
  UserCircle,
  Users,
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
    label: 'Lịch sử hoạt động',
    to: '/admin/activity',
    icon: ClockCounterClockwise,
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
    title: 'Lịch sử hoạt động',
    description: 'Nhật ký thao tác và sự kiện quan trọng trên hệ thống.',
  },
  profile: {
    title: 'Hồ sơ',
    description: 'Thông tin tài khoản quản trị viên.',
  },
};
