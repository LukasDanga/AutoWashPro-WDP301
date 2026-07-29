/**
 * AutoWashPro Utils
 * Common utility functions
 */

import { parseISO, isValid } from 'date-fns';

export const formatCurrency = (amount?: number): string => {
  if (!amount || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Combine a bookingDate (ISO string from MongoDB, e.g. "2026-06-27T00:00:00.000Z"
 * or plain "YYYY-MM-DD") with a HH:mm startTime into a Date.
 *
 * The MongoDB bookingDate is stored as UTC midnight of the booking day in VN
 * (UTC+7). Treating it as UTC and adding the local VN time produces a valid
 * Date that compares correctly against `new Date()` on the client.
 */
export const parseBookingDateTime = (
  bookingDate?: string | Date,
  time?: string,
): Date | null => {
  if (!bookingDate || !time) return null;

  const isoString =
    typeof bookingDate === 'string'
      ? bookingDate
      : bookingDate.toISOString();

  // Prefer ISO parse — handles "2026-06-27T00:00:00.000Z" and full ISO.
  const isoParsed = parseISO(`${isoString.split('T')[0]}T${time}:00`);
  if (isValid(isoParsed)) return isoParsed;

  // Fallback: treat as local datetime (used when bookingDate is "YYYY-MM-DD")
  const localParsed = new Date(`${isoString.split('T')[0]}T${time}:00`);
  return isValid(localParsed) ? localParsed : null;
};

export * from './tierHelper';
export * from './dynamicTranslator';
