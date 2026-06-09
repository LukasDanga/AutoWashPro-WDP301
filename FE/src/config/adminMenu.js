import {
  Buildings,
  ChartLine,
  ClockCounterClockwise,
  Gift,
  Package,
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
    id: 'packages',
    label: 'Quản lý gói dịch vụ',
    to: '/admin/packages',
    icon: Package,
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
  branches: {
    title: 'Quản lý chi nhánh',
    description: 'Xem, thêm, sửa và quản lý trạng thái các chi nhánh rửa xe.',
  },
  users: {
    title: 'Quản lý người dùng',
    description: 'Quản lý tài khoản khách hàng, nhân viên và phân quyền.',
  },
  packages: {
    title: 'Quản lý gói dịch vụ',
    description: 'Xem, thêm, sửa và quản lý các gói dịch vụ rửa xe.',
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
