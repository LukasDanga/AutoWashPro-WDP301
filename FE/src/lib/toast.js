import toast from 'react-hot-toast';

/**
 * Thông báo toast dùng chung toàn app — hiển thị giữa-trên (top-center).
 * Giữ chữ ký (message, type) tương thích với các `notify` cũ.
 */
export function showToast(message, type = 'success') {
  if (!message) return;
  if (type === 'error') return toast.error(message);
  if (type === 'loading') return toast.loading(message);
  return toast.success(message);
}

export { toast };
export default showToast;
