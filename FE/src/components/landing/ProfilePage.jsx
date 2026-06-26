import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast as fireToast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TIER_MAP = {
  diamond: { label: 'Kim cương', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', min: 10000 },
  gold: { label: 'Vàng', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', min: 5000 },
  silver: { label: 'Bạc', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300', min: 2000 },
  bronze: { label: 'Đồng', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', min: 0 },
};

export default function ProfilePage({ user, vehicles: initialVehicles, onLogout, apiBase, token, onBack, onUserUpdate }) {
  const isLoggedIn = !!user && !!token;
  const [activeTab, setActiveTab] = useState('info');
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [form, setForm] = useState({ licensePlate: '', vehicleType: 'car', brand: '', model: '', color: '', year: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [editFormVehicle, setEditFormVehicle] = useState({ licensePlate: '', vehicleType: 'car', brand: '', model: '', color: '', year: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  async function handleAddVehicle(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Thêm xe thất bại');
      const payload = await res.json();
      const newVehicle = payload?.data || payload;
      setVehicles(prev => [...prev, newVehicle]);
      setShowAddVehicle(false);
      setForm({ licensePlate: '', vehicleType: 'car', brand: '', model: '', color: '', year: '' });
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteVehicle(vId) {
    if (!(await confirmDialog({ title: 'Xóa xe', message: 'Bạn có chắc chắn muốn xóa xe này?', confirmLabel: 'Xóa', danger: true }))) return;
    try {
      await fetch(`${apiBase || API_BASE}/vehicles/${vId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(prev => prev.filter(v => (v._id || v.id) !== vId));
    } catch (e) { alert(e.message); }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      const payload = await res.json();
      const updated = payload?.data || payload;
      setEditing(false);
      showToast('Đã cập nhật thành công');
      if (onUserUpdate) onUserUpdate(updated);
    } catch (e) {
      showToast(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleUpdateVehicle(e) {
    e.preventDefault();
    const vId = editVehicle?._id || editVehicle?.id;
    if (!vId) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/vehicles/${vId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editFormVehicle),
      });
      if (!res.ok) throw new Error('Cập nhật xe thất bại');
      const payload = await res.json();
      const updated = payload?.data || payload;
      setVehicles(prev => prev.map(v => ((v._id || v.id) === vId ? updated : v)));
      setShowEditVehicle(false);
      setEditVehicle(null);
      showToast('Đã cập nhật xe thành công');
    } catch (e) {
      showToast(e.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  function openEditVehicle(v) {
    setEditVehicle(v);
    setEditFormVehicle({
      licensePlate: v.licensePlate || '',
      vehicleType: v.vehicleType || 'car',
      brand: v.brand || '',
      model: v.model || '',
      color: v.color || '',
      year: v.year || '',
    });
    setShowEditVehicle(true);
  }

  function showToast(message) {
    fireToast(message);
  }

  const tier = TIER_MAP[user?.tier] || TIER_MAP.bronze;
  const nextTier = user?.tier === 'bronze' ? 'silver' : user?.tier === 'silver' ? 'gold' : user?.tier === 'gold' ? 'diamond' : null;
  const nextTierInfo = nextTier ? TIER_MAP[nextTier] : null;
  const tierProgress = nextTierInfo
    ? Math.min(100, Math.floor(((user?.lifetimePoints || 0) / nextTierInfo.min) * 100))
    : 100;

  function formatCurrency(v) {
    return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Trang chủ
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.name || user?.email}</span>
            <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
              Thoát
            </button>
          </div>
        </div>
      </header>

      {toast.show && (
        <div className="awp-toast-container">
          <div className={`awp-toast-message ${toast.message === 'Đã cập nhật thành công' ? 'awp-toast-success' : 'awp-toast-error'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 text-xl font-bold">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{user?.name || 'Thành viên mới'}</h1>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.phone && <p className="text-sm text-slate-400">{user.phone}</p>}
              </div>
              <div className="ml-auto">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${tier.bg} ${tier.color}`}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {tier.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Điểm tích lũy</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{user?.loyaltyPoints || 0}</p>
              </div>
              <div className="p-5 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Xe đã đăng ký</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{vehicles.length}</p>
              </div>
            </div>

            {nextTierInfo && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lên hạng {nextTierInfo.label}</span>
                  <span className="text-xs text-slate-400">{user?.lifetimePoints || 0} / {nextTierInfo.min} điểm</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${tierProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-8">
              {['info', 'vehicles'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {tab === 'info' ? 'Thông tin' : 'Xe của tôi'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'info' && (
                <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {editing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1.5">Tên</label>
                          <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1.5">Email</label>
                          <input value={user?.email || ''} disabled
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1.5">Số điện thoại</label>
                          <input required value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 block mb-1.5">Ngày tham gia</label>
                          <input value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '...'} disabled
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => { setEditing(false); setEditForm({ name: user?.name || '', phone: user?.phone || '' }); }}
                          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                          Hủy
                        </button>
                        <button type="submit" disabled={editSaving}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50">
                          {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                          <p className="text-xs text-slate-400">Tên</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">{user?.name || 'Chưa cập nhật'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                          <p className="text-xs text-slate-400">Email</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">{user?.email}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                          <p className="text-xs text-slate-400">Số điện thoại</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">{user?.phone || 'Chưa cập nhật'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                          <p className="text-xs text-slate-400">Ngày tham gia</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '...'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setEditing(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
                        Chỉnh sửa thông tin
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'vehicles' && (
                <motion.div key="vehicles" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="space-y-3">
                    {vehicles.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">Chưa có xe nào. Hãy thêm xe mới.</div>
                    )}
                    {vehicles.map(v => {
                      const vId = v._id || v.id;
                      return (
                        <div key={vId} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{v.brand} {v.model || ''}</p>
                              <p className="text-xs text-slate-400">{v.licensePlate} · {v.vehicleType} · {v.color}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditVehicle(v)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteVehicle(vId)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1.5">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => setShowAddVehicle(true)}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all text-sm font-medium flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Thêm xe mới
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddVehicle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowAddVehicle(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Thêm xe mới</h3>
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Biển số xe *</label>
                  <input required value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Loại xe *</label>
                    <select required value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                      <option value="car">Xe con</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Xe tải</option>
                      <option value="motorcycle">Xe máy</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Năm sản xuất</label>
                    <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Hãng xe *</label>
                  <input required value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Dòng xe</label>
                  <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Màu xe *</label>
                  <input required value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddVehicle(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50">
                    {submitting ? 'Đang thêm...' : 'Thêm xe'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditVehicle && editVehicle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => { setShowEditVehicle(false); setEditVehicle(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Chỉnh sửa xe</h3>
              <form onSubmit={handleUpdateVehicle} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Biển số xe *</label>
                  <input required value={editFormVehicle.licensePlate} onChange={e => setEditFormVehicle(f => ({ ...f, licensePlate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Loại xe *</label>
                    <select required value={editFormVehicle.vehicleType} onChange={e => setEditFormVehicle(f => ({ ...f, vehicleType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                      <option value="car">Xe con</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Xe tải</option>
                      <option value="motorcycle">Xe máy</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Năm sản xuất</label>
                    <input type="number" value={editFormVehicle.year} onChange={e => setEditFormVehicle(f => ({ ...f, year: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Hãng xe *</label>
                  <input required value={editFormVehicle.brand} onChange={e => setEditFormVehicle(f => ({ ...f, brand: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Dòng xe</label>
                  <input value={editFormVehicle.model} onChange={e => setEditFormVehicle(f => ({ ...f, model: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Màu xe *</label>
                  <input required value={editFormVehicle.color} onChange={e => setEditFormVehicle(f => ({ ...f, color: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowEditVehicle(false); setEditVehicle(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={editSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50">
                    {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
