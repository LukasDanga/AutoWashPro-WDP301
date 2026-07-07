/**
 * AutoWashPro TypeScript Types
 * All type definitions for the app
 */

// ============ User Types ============
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'manager' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  loyaltyPoints: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ============ Vehicle Types ============
export type VehicleType = 'sedan' | 'suv' | 'pickup' | 'van' | 'motorcycle';

export interface Vehicle {
  _id: string;
  userId: string;
  licensePlate: string;
  vehicleType: VehicleType;
  brand: string;
  model?: string;
  color: string;
  year?: number;
  imageUrl?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  vehicleType: VehicleType;
  brand: string;
  model?: string;
  color: string;
  year?: number;
  imageUrl?: string;
  isDefault?: boolean;
}

// ============ Branch Types ============
export interface Branch {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  openingTime: string;
  closingTime: string;
  status: 'active' | 'inactive';
  image?: string;
  description?: string;
  isHot?: boolean;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: string;
  updatedAt: string;
}

// ============ Package Types ============
export type PackageCategory = 'external' | 'internal' | 'full';

export interface SubService {
  name: string;
  price: number;
  duration?: number;
  isOptional: boolean;
}

export interface Package {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // minutes
  image?: string;
  status: 'active' | 'inactive';
  category: PackageCategory;
  vehicleTypes: VehicleType[];
  subServices?: SubService[];
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Booking Types ============
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';

export interface Booking {
  _id: string;
  userId: string;
  branchId: string | Branch;
  packageId: string | Package;
  vehicleId: string | Vehicle;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  note?: string;
  subServices?: SubService[];
  voucherCode?: string;
  discountAmount?: number;
  deposit?: number;
  finalPrice: number;
  totalPrice?: number; // alias kept for legacy callers
  qrCode?: string;
  rating?: number;
  feedback?: string;
  reply?: string;
  isRecurring?: boolean;
  recurringGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  branchId: string;
  packageId: string;
  vehicleId: string;
  bookingDate: string;
  startTime: string;
  note?: string;
  voucherCode?: string;
  subServices?: string[];
}

export interface CreateRecurringBookingRequest {
  branchId: string;
  packageId: string;
  vehicleId: string;
  weekdays: number[]; // 0-6, Sunday = 0
  startTime: string; // HH:mm
  weeks: number; // 1-12
  note?: string;
  voucherCode?: string;
}

export interface RecurringBookingResult {
  recurringGroupId: string;
  totalCreated: number;
  totalFailed: number;
  created: Booking[];
  failed: { date: string; reason: string }[];
}

export interface RecurringConfig {
  weekdays: number[];
  startTime: string;
  weeks: number;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  vipOnly?: boolean;
}

// ============ Payment Types ============
export type PaymentMethod = 'cash' | 'momo' | 'vnpay';
export type PaymentType = 'deposit' | 'remaining' | 'full';

export interface Payment {
  _id: string;
  bookingId: string | Booking;
  userId: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  paymentMethod: PaymentMethod;
  type?: PaymentType;
}

// Re-export SubService as a named type so other modules can reuse it
export type { SubService as SubServiceItem };

// ============ Stat / Public Types (extra) ============
export interface ChatSessionMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatHistoryItem {
  _id: string;
  userId?: string;
  sessionId: string;
  messages: ChatSessionMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============ Voucher Types ============
export type VoucherType = 'percentage' | 'fixed';

export interface Voucher {
  _id: string;
  code: string;
  title?: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  expiresAt?: string;
  used?: boolean;
  status?: 'active' | 'inactive';
  type?: VoucherType;
  value?: number;
  minOrder?: number;
  validFrom?: string;
  validTo?: string;
  tierExclusive?: 'bronze' | 'silver' | 'gold' | 'diamond';
  usageLimit?: number;
  usedCount?: number;
  perUserLimit?: number;
  requiredPoints?: number;
  isTemplate?: boolean;
  packageIds?: string[];
  branchIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserVoucher extends Voucher {
  isUsed?: boolean;
  usedAt?: string;
  bookingId?: string;
}

export interface ValidateVoucherRequest {
  code: string;
  bookingData?: {
    packageId?: string;
    branchId?: string;
    amount?: number;
  };
}

export interface ReserveVoucherRequest {
  code: string;
  bookingId: string;
  discountAmount?: number;
}

// ============ Slot Pack Types ============
export interface SlotPack {
  _id: string;
  userId: string;
  branchId: string | Branch;
  packageId: string | Package;
  vehicleId: string | Vehicle;
  totalSlots: number;
  usedSlots: number;
  remainingSlots: number;
  discount: number; // percentage
  finalPrice: number;
  totalPrice?: number; // alias kept for legacy callers
  unitPrice: number;
  packCode: string;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlotPackRequest {
  branchId: string;
  packageId: string;
  vehicleId: string;
  totalSlots: number;
  voucherCode?: string;
  expiresAt?: string;
}

// ============ Notification Types ============
export type NotificationType = 
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_completed'
  | 'payment_success'
  | 'voucher_expiring'
  | 'points_earned'
  | 'promotion';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

// ============ Public Types ============
export interface PublicStats {
  totalBookings: number;
  totalCustomers: number;
  totalBranches: number;
  averageRating: number;
}

export interface Gift {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  pointsRequired: number;
  stock: number;
  status: 'active' | 'inactive';
}

export interface SlotProduct {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  slots: number;
  discount: number;
  originalPrice: number;
  finalPrice: number;
  status: 'active' | 'inactive';
}

export interface Testimonial {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  reply?: string;
  bookingId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// ============ API Response Types ============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============ Error Types ============
export interface ApiError {
  message: string;
  errors?: Record<string, string>;
  code?: string;
}
