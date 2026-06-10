import { getApiBaseUrl, getStoredToken, readApiError } from '@/lib/authStorage';

async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const token = getStoredToken();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorMsg = await readApiError(res);
    throw new Error(errorMsg);
  }

  const payload = await res.json();
  return payload?.data ?? payload;
}

export const userService = {
  /**
   * Lấy danh sách người dùng với bộ lọc vai trò và trạng thái
   */
  async getAllUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    return apiFetch(`/auth/users?${params}`);
  },

  /**
   * Tạo tài khoản admin/manager mới
   */
  async createUser(userData) {
    return apiFetch('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Cập nhật thông tin tài khoản người dùng
   */
  async updateUser(userId, userData) {
    return apiFetch(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Xóa tài khoản người dùng
   */
  async deleteUser(userId) {
    return apiFetch(`/auth/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
