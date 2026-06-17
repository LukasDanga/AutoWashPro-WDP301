import { useEffect, useState } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

const EMPTY_FORM = { name: '', description: '', price: '', duration: '', category: 'external', vehicleTypes: [] };
const CATEGORIES = [
  { value: 'external', label: 'Rửa ngoại thất' },
  { value: 'internal', label: 'Vệ sinh nội thất' },
  { value: 'full', label: 'Toàn bộ' },
];
const VEHICLE_TYPES = ['sedan', 'suv', 'pickup', 'van', 'motorcycle'];

export default function ManagerPackages({ user }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const branchId = user?.branchId;

  async function loadPackages() {
    setLoading(true);
    try {
      const res = await api(`/packages?branchId=${branchId}`);
      const p = await res.json();
      setPackages(Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (branchId) loadPackages();
  }, [branchId]);

  function openCreate() {
    setEditPkg(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  }

  function openEdit(pkg) {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      price: String(pkg.price || ''),
      duration: String(pkg.duration || ''),
      category: pkg.category || 'external',
      vehicleTypes: pkg.vehicleTypes || [],
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.duration) {
      setError('Vui lòng điền tên, giá và thời gian.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        category: form.category,
        vehicleTypes: form.vehicleTypes,
      };
      const res = editPkg
        ? await api(`/packages/${editPkg._id || editPkg.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/packages', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu gói dịch vụ');
      setShowModal(false);
      loadPackages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(pkg) {
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
      await api(`/packages/${pkg._id || pkg.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      loadPackages();
    } catch { /* silent */ }
  }

  async function handleDelete(id) {
    try {
      await api(`/packages/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      loadPackages();
    } catch { /* silent */ }
  }

  function toggleVehicleType(vt) {
    setForm(prev => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(vt)
        ? prev.vehicleTypes.filter(x => x !== vt)
        : [...prev.vehicleTypes, vt],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Quản lý gói dịch vụ tại chi nhánh của bạn</p>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
          + Thêm gói
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Đang tải...</div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <span className="text-4xl">📦</span>
          <p className="text-sm">Chi nhánh chưa có gói dịch vụ nào.</p>
          <button onClick={openCreate} className="text-sm text-emerald-600 underline">Tạo gói đầu tiên</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map(pkg => {
            const id = pkg._id || pkg.id;
            const isActive = pkg.status === 'active';
            return (
              <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{pkg.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{pkg.description || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Giá</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(pkg.price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Thời gian</span>
                    <span className="font-medium text-slate-700">{pkg.duration} phút</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Loại</span>
                    <span className="font-medium text-slate-700 capitalize">{pkg.category || '—'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => openEdit(pkg)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Sửa
                  </button>
                  <button onClick={() => toggleStatus(pkg)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border border-amber-200 text-amber-600 hover:bg-amber-50'
                        : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </button>
                  <button onClick={() => setDeleteId(id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{editPkg ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Tên gói *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="VD: Rửa xe cơ bản" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  placeholder="Mô tả ngắn về gói dịch vụ" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Giá (đ) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="150000" min="0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Thời gian (phút) *</label>
                  <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="30" min="1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Danh mục</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">Loại xe áp dụng</label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPES.map(vt => (
                    <button key={vt} type="button" onClick={() => toggleVehicleType(vt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.vehicleTypes.includes(vt)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {vt}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {saving ? 'Đang lưu...' : editPkg ? 'Cập nhật' : 'Tạo gói'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
            <span className="text-4xl">🗑️</span>
            <p className="text-slate-700 font-medium">Xác nhận xoá gói dịch vụ này?</p>
            <p className="text-xs text-slate-400">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors">
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
