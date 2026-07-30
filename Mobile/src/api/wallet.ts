import { apiClient } from './client';

export interface WalletTransaction {
  _id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'deduction' | 'refund' | 'bonus' | 'credit' | 'debit' | string;
  description?: string;
  reason?: string;
  bookingId?: string | any;
  referenceId?: string;
  createdAt: string;
}

export const getWalletTransactions = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: WalletTransaction[]; pagination?: any }> => {
  const response = await apiClient.get('/wallet-transactions/my', { params });
  const payload = response.data as { data?: WalletTransaction[]; pagination?: any } | WalletTransaction[];
  
  if (Array.isArray(payload)) {
    return { data: payload };
  }
  return { data: payload.data || [], pagination: payload.pagination };
};

export const walletApi = {
  getWalletTransactions,
};

export default walletApi;
