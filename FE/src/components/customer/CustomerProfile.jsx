import { useEffect, useState, useRef } from 'react';
import {
  User, PencilSimple, Check, X, Car, Motorcycle,
  Phone, Envelope, CalendarBlank, MapPin, Crown,
  ShieldCheck, Certificate, Sparkle, Plus, Trash, Star,
} from '@phosphor-icons/react';

const VEHICLE_TYPE_LABELS = { sedan: 'Sedan', suv: 'SUV', pickup: 'Pickup', van: 'Van', motorcycle: 'Xe máy' };
const VEHICLE_TYPE_ICONS = { sedan: Car, suv: Car, pickup: Car, van: Car, motorcycle: Motorcycle };

function GenericSpinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ borderRadius: '16px' }}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <Icon size={16} weight="duotone" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function CustomerProfile({ apiBase, token }) {
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const notify = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/customer/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Không thể tải thông tin');
      const payload = await res.json();
      const data = payload?.data ?? payload;
      setProfile(data);
      setVehicles(data?.vehicles ?? []);
    } catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const startEdit = () => {
    setForm({ name: profile?.name || '', phone: profile?.phone || '', dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '' });
    setErrors({}); setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setErrors({}); };

  const handleSave = async () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Vui lòng nhập họ tên';
    if (!form.phone?.trim()) errs.phone = 'Vui lòng nhập số điện thoại';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() };
      if (form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
      const res = await fetch(`${apiBase}/auth/customer/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData?.message || 'Cập nhật thất bại'); }
      const payload = await res.json();
      const data = payload?.data ?? payload;
      setProfile(data); setVehicles(data?.vehicles ?? []); setEditing(false);
      notify('Cập nhật thông tin thành công');
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData(); fd.append('avatar', file);
      const res = await fetch(`${apiBase}/auth/customer/profile`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!res.ok) throw new Error('Tải ảnh thất bại');
      const payload = await res.json();
      setProfile(payload?.data ?? payload);
      notify('Cập nhật ảnh đại diện thành công');
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const VehicleIcon = ({ type }) => {
    const Icon = VEHICLE_TYPE_ICONS[type] || Car;
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
        <Icon size={20} weight="duotone" />
      </div>
    );
  };

  if (loading && !profile) return <div className="flex min-h-[400px] items-center justify-center text-slate-400"><GenericSpinner size={28} /></div>;

  const TIER_MAP = {
    bronze: { label: 'Đồng', icon: ShieldCheck, color: 'text-amber-700 bg-amber-50' },
    silver: { label: 'Bạc', icon: Certificate, color: 'text-slate-600 bg-slate-100' },
    gold: { label: 'Vàng', icon: Crown, color: 'text-yellow-600 bg-yellow-50' },
    diamond: { label: 'Kim cương', icon: Sparkle, color: 'text-emerald-600 bg-emerald-50' },
  };
  const tierInfo = TIER_MAP[profile?.tier] || TIER_MAP.bronze;
  const TierIcon = tierInfo.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {toast && (
        <div role="alert" className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${toast.type === 'error' ? 'bg-white text-red-600 ring-red-200' : 'bg-white text-emerald-700 ring-emerald-200'}`}>
          {toast.type === 'error' ? <X size={15} weight="fill" /> : <Check size={15} weight="fill" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="relative">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400"><User size={32} weight="duotone" /></div>
            )}
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={saving}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 transition-colors">
            <PencilSimple size={12} weight="bold" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {editing ? (
          <div className="w-full max-w-sm space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ tên</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full rounded-lg border ${errors.name ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors`} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Số điện thoại</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`w-full rounded-lg border ${errors.phone ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors`} />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày sinh</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-all"
                style={{ background: '#10b981' }}>
                {saving ? <GenericSpinner size={16} /> : <Check size={16} weight="bold" />} Lưu
              </button>
              <button onClick={cancelEdit} disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">{profile?.name || 'Khách hàng'}</h1>
            <button onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
              <PencilSimple size={13} weight="bold" /> Chỉnh sửa thông tin
            </button>
          </>
        )}
      </div>

      <SectionCard title="Thông tin cá nhân" icon={User}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: Envelope, label: 'Email', value: profile?.email || '—' },
            { icon: Phone, label: 'Điện thoại', value: profile?.phone || '—' },
            { icon: CalendarBlank, label: 'Ngày sinh', value: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : '—' },
            { icon: MapPin, label: 'Vai trò', value: profile?.role || '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: 'rgba(16,185,129,0.04)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                <item.icon size={16} weight="duotone" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-medium text-slate-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Hạng thành viên" icon={tierInfo.icon}>
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tierInfo.color}`}>
            <TierIcon size={28} weight="duotone" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-900 capitalize">{tierInfo.label}</p>
            <p className="text-sm text-slate-500"><span className="font-semibold text-slate-900">{profile?.loyaltyPoints ?? 0}</span> điểm tích lũy</p>
            <div className="mt-2 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((profile?.loyaltyPoints ?? 0) / 1000 * 100, 100)}%`, background: '#10b981' }} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Xe của tôi" icon={Car}
        action={
          <button onClick={() => notify('Tính năng đang phát triển', 'error')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus size={13} weight="bold" /> Thêm xe
          </button>
        }>
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <Car size={32} weight="thin" />
            <p className="text-sm">Chưa có xe nào. Thêm xe mới để đặt lịch nhanh hơn.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((v) => (
              <div key={v._id} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4" style={{ background: 'rgba(16,185,129,0.02)' }}>
                <VehicleIcon type={v.vehicleType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{v.licensePlate}</p>
                    {v.isDefault && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>Mặc định</span>}
                  </div>
                  <p className="text-xs text-slate-500">{v.brand}{v.model ? ` ${v.model}` : ''} &middot; {VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType}{v.color ? ` &middot; ${v.color}` : ''}</p>
                </div>
                <button onClick={() => notify('Tính năng đang phát triển', 'error')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
