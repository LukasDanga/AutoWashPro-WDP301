import { useState } from 'react';
import { motion } from 'framer-motion';

const services = [
  { id: 'basic', name: 'Rửa cơ bản', price: 99000, duration: '30 phút', desc: 'Xịt áp lực cao, rửa xà phòng, lau khô' },
  { id: 'premium', name: 'Rửa cao cấp', price: 249000, duration: '60 phút', desc: 'Rửa ngoại thất, hút bụi nội thất, đánh bóng nhanh' },
  { id: 'interior', name: 'Vệ sinh nội thất', price: 399000, duration: '90 phút', desc: 'Giặt ghế, vệ sinh trần, bảng điều khiển, khử mùi' },
  { id: 'ceramic', name: 'Phủ ceramic', price: 1490000, duration: '180 phút', desc: 'Phủ lớp bảo vệ sơn, giữ bóng 12 tháng' },
];

const branches = [
  { id: 'hn1', name: 'Hà Nội - Cầu Giấy', address: '122 Cầu Giấy, Q. Cầu Giấy', distance: '1.2 km' },
  { id: 'hn2', name: 'Hà Nội - Thanh Xuân', address: 'Nguyễn Trãi, Q. Thanh Xuân', distance: '3.5 km' },
  { id: 'hcm1', name: 'TP.HCM - Q.1', address: 'Lê Lợi, P. Bến Nghé', distance: '0.8 km' },
  { id: 'hcm2', name: 'TP.HCM - Thủ Đức', address: 'Võ Văn Ngân, P. Linh Chiểu', distance: '5.2 km' },
  { id: 'dn1', name: 'Đà Nẵng - Hải Châu', address: 'Nguyễn Văn Linh, Q. Hải Châu', distance: '1.0 km' },
];

const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function formatPrice(v) {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

export default function BookingWidget({ onOpenAuth }) {
  const [tab, setTab] = useState('regular');
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState(null);

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const reset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedBranch(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedDays([]);
    setStartDate(null);
  };

  const canNextStep = () => {
    if (step === 1) return selectedService;
    if (step === 2) return selectedBranch;
    if (step === 3) {
      if (tab === 'regular') return selectedDate && selectedTime;
      return startDate && selectedDays.length > 0 && selectedTime;
    }
    return true;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === s
              ? 'bg-emerald-600 text-white shadow-md'
              : step > s
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
          }`}>
            {step > s ? '✓' : s}
          </div>
          {s < 4 && <div className={`w-8 md:w-12 h-0.5 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <section id="booking" className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Đặt lịch
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">
            Trải nghiệm đặt lịch
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">Chọn dịch vụ, chọn chi nhánh, chọn thời gian - và chúng tôi lo phần còn lại.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 md:p-10">
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit mx-auto mb-8">
            <button
              onClick={() => { setTab('regular'); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'regular' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đặt lịch thường
            </button>
            <button
              onClick={() => { setTab('recurring'); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'recurring' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đặt lịch định kì
            </button>
          </div>

          {renderStepIndicator()}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn dịch vụ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedService(svc)}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      selectedService?.id === svc.id
                        ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-slate-800">{svc.name}</span>
                      <span className="text-emerald-600 font-bold">{formatPrice(svc.price)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{svc.desc}</p>
                    <span className="text-xs text-slate-400">{svc.duration}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn chi nhánh</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranch(b)}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      selectedBranch?.id === b.id
                        ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="10" r="3" />
                        <path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{b.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{b.address}</div>
                        <div className="text-xs text-emerald-600 mt-1">{b.distance}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn thời gian</h3>

              {tab === 'recurring' && (
                <div className="mb-8">
                  <label className="text-sm text-slate-500 block mb-3">Các ngày trong tuần</label>
                  <div className="flex gap-2">
                    {weekDays.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${
                          selectedDays.includes(d)
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="text-sm text-slate-500 block mb-3">
                  {tab === 'regular' ? 'Chọn ngày' : 'Chọn ngày bắt đầu'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dates.map((d) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const isSelected = tab === 'regular'
                      ? selectedDate === dateStr
                      : startDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (tab === 'regular') setSelectedDate(dateStr);
                          else setStartDate(dateStr);
                        }}
                        className={`min-w-[60px] p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs text-slate-400 font-medium">
                          {d.toLocaleDateString('vi-VN', { weekday: 'narrow' })}
                        </div>
                        <div className="text-base font-bold text-slate-800 mt-1">
                          {d.getDate()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {d.toLocaleDateString('vi-VN', { month: 'numeric' })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500 block mb-3">Chọn khung giờ</label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        selectedTime === t
                          ? 'border-emerald-400 bg-emerald-50/50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Xác nhận đặt lịch</h3>

              <div className="max-w-sm mx-auto mt-8 space-y-3 text-left">
                <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 text-sm">Dịch vụ</span>
                  <span className="text-slate-800 font-medium text-sm">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 text-sm">Chi nhánh</span>
                  <span className="text-slate-800 font-medium text-sm">{selectedBranch?.name}</span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 text-sm">Thời gian</span>
                  <span className="text-slate-800 font-medium text-sm">
                    {tab === 'regular'
                      ? `${new Date(selectedDate).toLocaleDateString('vi-VN')} ${selectedTime}`
                      : `${new Date(startDate).toLocaleDateString('vi-VN')} ${selectedTime} (${selectedDays.join(', ')})`}
                  </span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 font-semibold text-sm">Tổng cộng</span>
                  <span className="text-emerald-700 font-bold">{formatPrice(selectedService?.price)}</span>
                </div>
              </div>

              <button
                onClick={onOpenAuth}
                className="mt-8 px-10 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm
                  shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)]
                  hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)]
                  transition-all duration-300"
              >
                Đăng nhập để xác nhận
              </button>
              <p className="text-slate-400 text-xs mt-3">Bạn cần đăng nhập để hoàn tất đặt lịch</p>
            </motion.div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium
                  hover:bg-slate-50 transition-colors"
              >
                Quay lại
              </button>
            ) : <div />}
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNextStep()}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  canNextStep()
                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Tiếp theo
              </button>
            ) : (
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium
                  hover:bg-slate-50 transition-colors"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
