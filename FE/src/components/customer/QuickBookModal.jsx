import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Car, MapPin, Sparkles, Zap, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';

export default function QuickBookModal({ pack, userVehicles = [], branches = [], apiBase, token, onClose, onSuccess }) {
  const pkg = pack?.packageId;
  const initialBranchId = pack?.branchId?._id || pack?.branchId?.id || pack?.branchId || '';

  const safeVehicles = Array.isArray(userVehicles) ? userVehicles : [];
  const safeBranches = Array.isArray(branches) ? branches : [];

  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);
  const [selectedVehicle, setSelectedVehicle] = useState(pack?.vehicleId?._id || pack?.vehicleId?.id || pack?.vehicleId || '');
  const [selectedSubServices, setSelectedSubServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [error, setError] = useState('');

  // Dates: Next 7 days
  const bookingDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`;
      dates.push({
        iso,
        dayName,
        dayNum: d.getDate(),
        month: d.getMonth() + 1
      });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState(bookingDates[0].iso);

  // Default vehicle selection if not set
  useEffect(() => {
    if (!selectedVehicle && userVehicles.length > 0) {
      setSelectedVehicle(userVehicles[0]._id || userVehicles[0].id || '');
    }
  }, [userVehicles, selectedVehicle]);

  // Default branch selection if not set
  useEffect(() => {
    if (!selectedBranch && branches.length > 0) {
      setSelectedBranch(branches[0]._id || branches[0].id || '');
    }
  }, [branches, selectedBranch]);

  // Fetch available slots when Branch, Date & Package are selected
  useEffect(() => {
    if (!selectedBranch || !selectedDate || !pkg) return;
    const pkgId = pkg._id || pkg.id || pkg;
    async function fetchSlots() {
      setSlotsLoading(true);
      setSelectedTime('');
      try {
        const res = await fetch(`${apiBase}/bookings/slots?branchId=${selectedBranch}&date=${selectedDate}&packageId=${pkgId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const slots = data?.data || data || [];
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch (e) {
        console.error('Failed to fetch slots:', e);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchSlots();
  }, [selectedBranch, selectedDate, pkg, apiBase, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranch) { setError('Vui lòng chọn chi nhánh'); return; }
    if (!selectedVehicle) { setError('Vui lòng chọn xe'); return; }
    if (!selectedDate || !selectedTime) { setError('Vui lòng chọn ngày và giờ hẹn'); return; }

    setLoading(true);
    setError('');

    try {
      const pkgId = pkg?._id || pkg?.id || pkg;
      const res = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branchId: selectedBranch,
          packageId: pkgId,
          vehicleId: selectedVehicle,
          bookingDate: selectedDate,
          startTime: selectedTime,
          selectedSubServices,
          slotPackId: pack._id, // KEY: Uses slot pack!
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tạo lịch hẹn');
      }

      showToast(`Đặt lịch thành công qua Gói Lượt! Mã: #${data?.data?.bookingCode || data?.data?.code || ''}`, 'success');
      if (onSuccess) onSuccess(data?.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap size={14} className="fill-emerald-300 stroke-none" />
              Đặt lịch nhanh bằng Gói Lượt
            </div>
            <h3 className="text-xl font-extrabold">{pkg?.name || 'Gói dịch vụ'}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-emerald-100 font-medium">
              <span className="bg-white/15 px-2.5 py-1 rounded-lg font-mono font-bold tracking-wider">
                {pack.packCode}
              </span>
              <span>•</span>
              <span className="bg-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-50 font-bold">
                Còn lại {pack.remainingSlots}/{pack.totalSlots} lượt
              </span>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* 1. Chọn Chi nhánh (Nếu gói chưa khóa chi nhánh) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                Chi nhánh
              </label>
              {pack?.branchId && typeof pack.branchId === 'object' ? (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center text-sm font-semibold text-slate-800">
                  <span>{pack.branchId.name}</span>
                  <span className="text-xs text-slate-400 font-normal">Cố định theo gói</span>
                </div>
              ) : (
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {safeBranches.map(b => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.name} ({b.address})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Chọn Xe */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                <Car size={14} className="text-emerald-600" />
                Chọn xe rửa
              </label>
              {safeVehicles.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
                  Bạn chưa có xe trong hệ thống. Vui lòng thêm xe ở trang cá nhân hoặc đăng nhập lại.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {safeVehicles.map(v => {
                    const vid = v._id || v.id;
                    const isSelected = selectedVehicle === vid;
                    return (
                      <button
                        type="button"
                        key={vid}
                        onClick={() => setSelectedVehicle(vid)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10 font-bold text-emerald-900'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{v.brand || ''} {v.model || ''}</div>
                          <div className="text-[11px] font-mono text-slate-400">{v.licensePlate}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Chọn Ngày */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" />
                Ngày đặt lịch
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {bookingDates.map(d => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      type="button"
                      key={d.iso}
                      onClick={() => setSelectedDate(d.iso)}
                      className={`flex-1 min-w-[70px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">{d.dayName}</span>
                      <span className="text-base font-extrabold">{d.dayNum}</span>
                      <span className="text-[10px] opacity-70">Thg {d.month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Chọn Giờ */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-600" />
                  Khung giờ khả dụng
                </span>
                {slotsLoading && <RefreshCw size={12} className="animate-spin text-emerald-600" />}
              </label>
              {slotsLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Đang tìm khung giờ trống...</div>
              ) : availableSlots.filter(s => s.available).length === 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium text-center">
                  Hôm nay đã hết khung giờ trống tại chi nhánh này. Vui lòng chọn ngày khác.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.filter(s => s.available).map(s => {
                    const isSelected = selectedTime === s.startTime;
                    return (
                      <button
                        type="button"
                        key={s.startTime}
                        onClick={() => setSelectedTime(s.startTime)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        {s.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional Sub-services */}
            {pkg?.subServices && pkg.subServices.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Dịch vụ thêm (Tùy chọn)
                </label>
                <div className="space-y-2">
                  {pkg.subServices.map(sub => {
                    const checked = selectedSubServices.includes(sub.name);
                    return (
                      <button
                        type="button"
                        key={sub.name}
                        onClick={() => {
                          setSelectedSubServices(prev =>
                            checked ? prev.filter(x => x !== sub.name) : [...prev, sub.name]
                          );
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                          checked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{sub.name}</span>
                        <span className="text-emerald-600 font-bold">
                          {sub.price > 0 ? `+${new Intl.NumberFormat('vi-VN').format(sub.price)}đ` : 'Miễn phí'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedTime || !selectedVehicle}
              className={`flex-[2] py-3 rounded-xl text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                loading || !selectedTime || !selectedVehicle
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Đang tạo lịch...
                </>
              ) : (
                <>
                  <Zap size={16} className="fill-white" />
                  Xác nhận đặt ngay (0đ)
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
