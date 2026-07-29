export const SOCKET_EVENTS = {
  NOTIFICATION: 'notification',
  BOOKING_NEW: 'booking_new',
  SLOTS_UPDATED: 'slots_updated',
  PAYMENT_NEW: 'payment_new',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  FEEDBACK_NEW: 'feedback_new',
  VOUCHERS_UPDATED: 'vouchers_updated',
  WALLET_TOPUP_SUCCESS: 'wallet_topup_success',
  POINTS_UPDATED: 'points_updated',
  SPIN_ADDED: 'spin_added',
  SLOT_PACK_PAID: 'slot_pack_paid',
  MY_BOOKINGS_UPDATED: 'my_bookings_updated',
  MY_VEHICLES_UPDATED: 'my_vehicles_updated',
  REFUND_REQUEST_UPDATED: 'refund_request_updated',
  REFUND_REQUEST_NEW: 'refund_request_new',
  REFUND_REQUESTS_UPDATED: 'refund_requests_updated',
  SYSTEM: 'system',
  PING: 'ping'
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
