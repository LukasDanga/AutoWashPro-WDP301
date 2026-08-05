import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  Sparkles,
  Shield,
  Layers,
  ArrowUp,
  ArrowDown,
  Eye,
} from 'lucide-react';
import { getApiBaseUrl, getStoredToken } from '../../lib/authStorage';

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'policy',
    icon: '📜',
    shortDescription: '',
    order: 1,
    isActive: true,
    linkUrl: '',
    sections: [{ subtitle: '', body: '' }]
  });

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

  const handleSeed = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khởi tạo / reset bộ chính sách & dịch vụ mẫu chuẩn?')) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/policies/seed?force=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccessMsg(data.message || 'Khởi tạo thành công!');
        loadPolicies();
      } else {
        setError(data?.message || 'Không thể khởi tạo dữ liệu mẫu');
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        title: policy.title || '',
        slug: policy.slug || '',
        category: policy.category || 'policy',
        icon: policy.icon || '📜',
        shortDescription: policy.shortDescription || '',
        order: policy.order ?? 1,
        isActive: policy.isActive ?? true,
        linkUrl: policy.linkUrl || '',
        sections: policy.sections && policy.sections.length > 0
          ? policy.sections.map(s => ({ subtitle: s.subtitle || '', body: s.body || '' }))
          : [{ subtitle: '', body: '' }]
      });
    } else {
      setEditingPolicy(null);
      const nextOrder = policies.length + 1;
      setFormData({
        title: '',
        slug: '',
        category: 'policy',
        icon: '📜',
        shortDescription: '',
        order: nextOrder,
        isActive: true,
        linkUrl: '',
        sections: [{ subtitle: '', body: '' }]
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPolicy(null);
  };

  const handleSectionChange = (index, field, value) => {
    const newSections = [...formData.sections];
    newSections[index][field] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const handleAddSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { subtitle: '', body: '' }]
    });
  };

  const handleRemoveSection = (index) => {
    if (formData.sections.length <= 1) {
      alert('Chính sách cần ít nhất 1 mục nội dung!');
      return;
    }
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: newSections });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề!');
      return;
    }

    const autoSlug = formData.slug.trim() || formData.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "d")
      .replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

    const payload = {
      ...formData,
      slug: autoSlug,
      sections: formData.sections.filter(s => s.subtitle.trim() || s.body.trim())
    };

    setSubmitting(true);
    try {
      const token = getStoredToken();
      const url = editingPolicy
        ? `${apiBase}/policies/${editingPolicy._id}`
        : `${apiBase}/policies`;
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        setSuccessMsg(editingPolicy ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        handleCloseModal();
        loadPolicies();
      } else {
        alert(data?.message || 'Có lỗi xảy ra!');
      }
    } catch {
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (policy) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/policies/${policy._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !policy.isActive })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        loadPolicies();
      } else {
        alert(data?.message || 'Không thể thay đổi trạng thái!');
      }
    } catch {
      alert('Lỗi kết nối!');
    }
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${policy.title}"?`)) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`${apiBase}/policies/${policy._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccessMsg('Đã xóa thành công!');
        loadPolicies();
      } else {
        alert(data?.message || 'Không thể xóa!');
      }
    } catch {
      alert('Lỗi kết nối!');
    }
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
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quản lý Chính sách & Dịch vụ Động</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Điều chỉnh nội dung hiển thị ở Landing Footer & Trang Điều khoản dịch vụ toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Seed Dữ liệu mẫu</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm Chính sách / Dịch vụ</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'all', label: 'Tất cả', icon: Layers },
            { id: 'policy', label: 'Chính sách & Hỗ trợ', icon: Shield },
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
            placeholder="Tìm kiếm chính sách..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin text-emerald-600" />
            <span>Đang tải danh sách chính sách...</span>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Không tìm thấy chính sách hoặc dịch vụ nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên & Slug</th>
                  <th className="py-3 px-4">Thể loại</th>
                  <th className="py-3 px-4 text-center">Số mục nội dung</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPolicies.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {p.order ?? idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base shrink-0">
                          {p.icon || '📜'}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{p.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">/{p.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.category === 'featured_service' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                          <Sparkles size={12} /> Dịch vụ nổi bật
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                          <Shield size={12} /> Chính sách & Điều khoản
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                      {p.sections ? p.sections.length : 0} mục
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          p.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        {p.isActive ? 'Hiển thị' : 'Ẩn'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingPolicy ? `Chỉnh sửa: ${editingPolicy.title}` : 'Thêm mới Chính sách / Dịch vụ'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Chính sách bảo mật"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Slug URL (Tự tạo nếu trống)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="VD: privacy"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thể loại</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="policy">Chính sách & Hỗ trợ (Footer Col 3 & PolicyPage)</option>
                    <option value="featured_service">Dịch vụ nổi bật (Footer Col 2)</option>
                  </select>
                </div>

                {/* Icon */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Icon (Emoji / Biểu tượng)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="VD: 🔒 hoặc 🧽"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thứ tự hiển thị (Order)</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link URL (Cho dịch vụ nổi bật)</label>
                  <input
                    type="text"
                    value={formData.linkUrl}
                    onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="VD: /#services"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Mô tả tóm tắt ngắn gọn..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Is Active Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="font-bold text-slate-800">
                  Kích hoạt hiển thị công khai trên ứng dụng
                </label>
              </div>

              {/* Dynamic Sections List */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>Nội dung chi tiết các mục</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                      {formData.sections.length} mục
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                  >
                    <Plus size={14} /> Thêm mục nội dung
                  </button>
                </div>

                {formData.sections.map((section, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">Mục #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(idx)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Xóa mục này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder={`VD: ${idx + 1}. Quy định chung`}
                        value={section.subtitle}
                        onChange={e => handleSectionChange(idx, 'subtitle', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        placeholder="Nội dung chi tiết của mục này..."
                        value={section.body}
                        onChange={e => handleSectionChange(idx, 'body', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : (editingPolicy ? 'Lưu thay đổi' : 'Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
