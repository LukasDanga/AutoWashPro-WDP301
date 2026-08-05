import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Layers,
  Shield,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getApiBaseUrl, getStoredToken } from '../../lib/authStorage';

export default function ManagerPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const apiBase = getApiBaseUrl();

  const loadPolicies = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/policies?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPolicies(data.data || []);
        if (data.data && data.data.length > 0) {
          setExpandedId(data.data[0]._id);
        }
      } else {
        setError(data?.message || 'Không thể tải danh sách chính sách');
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredPolicies = policies.filter(p => {
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quy định & Chính sách Hệ thống</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu nhanh các chính sách đặt lịch, hủy đơn, hoàn tiền và bảo hiểm xe để phục vụ khách hàng đồng bộ.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shrink-0">
          <Eye size={15} className="text-amber-600" />
          <span>Chế độ chỉ xem (View-only)</span>
        </div>
      </div>

      {/* Info Alert Box */}
      <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-200/80 p-4 rounded-2xl text-xs text-blue-900">
        <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold block mb-0.5">Dành cho Quản lý chi nhánh:</span>
          <span>
            Các chính sách dưới đây áp dụng chung cho toàn hệ thống AutoWashPro. Quản lý chi nhánh có quyền tra cứu nội dung chuẩn hóa để giải đáp thắc mắc hoặc hỗ trợ xử lý sự cố cho khách hàng. Nếu cần đề xuất thay đổi điều khoản, vui lòng liên hệ Ban Quản Trị (Admin).
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'all', label: 'Tất cả', icon: Layers },
            { id: 'policy', label: 'Chính sách & Điều khoản', icon: Shield },
            { id: 'featured_service', label: 'Dịch vụ nổi bật', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tra cứu chính sách..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Policies List Accordion */}
      {loading ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
          <RefreshCw size={20} className="animate-spin text-emerald-600" />
          <span>Đang nạp các quy định chính sách...</span>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
          Không tìm thấy nội dung chính sách phù hợp với tìm kiếm.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPolicies.map((p) => {
            const isExpanded = expandedId === p._id;
            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                {/* Header Row */}
                <button
                  onClick={() => toggleExpand(p._id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl shrink-0">
                      {p.icon || '📜'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                        {p.category === 'featured_service' ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                            Dịch vụ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            Chính sách
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                            Tạm ẩn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.shortDescription || `Mã tham chiếu: /${p.slug}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                      {p.sections ? `${p.sections.length} mục chi tiết` : ''}
                    </span>
                    <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </button>

                {/* Expanded Sections Content */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    {(p.sections && p.sections.length > 0) ? (
                      p.sections.map((sec, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                          <h4 className="font-bold text-emerald-800 text-xs">{sec.subtitle}</h4>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{sec.body}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">Chưa có thông tin mục chi tiết.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
