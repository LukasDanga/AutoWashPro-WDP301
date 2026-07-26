/**
 * Hộp thoại xác nhận dùng chung — thiết kế tối giản, sạch, không màu mè.
 * Nút chính màu trung tính (đen than); chỉ dùng đỏ khi `danger`.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  content,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  onConfirm,
  onCancel,
  danger = false,
  busy = false,
  hideCancel = false,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {message && <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>}
        {content && <div className="mt-4">{content}</div>}
        <div className="mt-6 flex justify-end gap-2.5">
          {!hideCancel && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
