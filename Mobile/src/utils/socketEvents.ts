export const SOCKET_EVENTS = {
  NOTIFICATION: 'notification',
  BOOKING_NEW: 'booking_new',
  SLOTS_UPDATED: 'slots_updated',
  PAYMENT_NEW: 'payment_new',
  FEEDBACK_NEW: 'feedback_new',
  VOUCHERS_UPDATED: 'vouchers_updated',
  WALLET_TOPUP_SUCCESS: 'wallet_topup_success',
  SPIN_ADDED: 'spin_added',
  SLOT_PACK_PAID: 'slot_pack_paid',
  MY_BOOKINGS_UPDATED: 'my_bookings_updated',
  MY_VEHICLES_UPDATED: 'my_vehicles_updated',
  SYSTEM: 'system',
  PING: 'ping'
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
