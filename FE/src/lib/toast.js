import toast from 'react-hot-toast';

/**
 * Thông báo toast dùng chung toàn app — hiển thị giữa-trên (top-center).
 * Hỗ trợ cả 2 cách gọi: showToast('nội dung', 'success') và showToast.success('nội dung')
 */
export const showToast = Object.assign(
  function (message, type = 'success') {
    if (!message) return;
    if (type === 'error') return toast.error(message);
    if (type === 'loading') return toast.loading(message);
    return toast.success(message);
  },
  {
    success: (message) => message && toast.success(message),
    error: (message) => message && toast.error(message),
    loading: (message) => message && toast.loading(message),
    dismiss: (id) => toast.dismiss(id),
  }
);

export { toast };
export default showToast;
