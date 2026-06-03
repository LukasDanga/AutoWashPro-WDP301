import {
  CalendarCheck,
  ChartPieSlice,
  ClipboardText,
  Buildings,
  Tag,
  UserCircle,
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
    id: 'checkins',
    label: 'Check-in',
    to: '/manager/checkins',
    icon: ClipboardText,
  },
  {
    id: 'branch',
    label: 'Chi nhánh của tôi',
    to: '/manager/branch',
    icon: Buildings,
  },
  {
    id: 'vouchers',
    label: 'Voucher',
    to: '/manager/vouchers',
    icon: Tag,
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
  checkins: {
    title: 'Quản lý check-in',
    description: 'Xác nhận khách đến, cập nhật tiến trình rửa xe.',
  },
  branch: {
    title: 'Chi nhánh của tôi',
    description: 'Xem và chỉnh sửa thông tin chi nhánh bạn phụ trách.',
  },
  vouchers: {
    title: 'Quản lý voucher',
    description: 'Tạo và quản lý mã giảm giá áp dụng tại chi nhánh.',
  },
  profile: {
    title: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản quản lý chi nhánh.',
  },
};
