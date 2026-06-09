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
    id: 'customers',
    label: 'Khách hàng',
    to: '/manager/customers',
    icon: Users,
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

  branch: {
    title: 'Chi nhánh của tôi',
    description: 'Xem và chỉnh sửa thông tin chi nhánh bạn phụ trách.',
  },
  vouchers: {
    title: 'Quản lý voucher',
    description: 'Tạo và quản lý mã giảm giá áp dụng tại chi nhánh.',
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
  profile: {
    title: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản quản lý chi nhánh.',
  },
};
