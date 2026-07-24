import { createRoot } from 'react-dom/client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

/**
 * Hộp thoại xác nhận dạng promise — thay cho window.confirm().
 * Dùng: if (!(await confirmDialog({ title, message, danger }))) return;
 */
export function confirmDialog({
  title = 'Xác nhận',
  message = '',
  content = null,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (val) => {
      root.unmount();
      host.remove();
      resolve(val);
    };
    root.render(
      <ConfirmDialog
        open
        title={title}
        message={message}
        content={content}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        danger={danger}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />,
    );
  });
}

export default confirmDialog;
