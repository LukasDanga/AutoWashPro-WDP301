import { useState, useEffect } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Star, ChatText, UserCircle } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

export default function ManagerFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    try {
      setLoading(true);
      setError('');
      const apiBase = getApiBaseUrl();
      const token = getStoredToken();
      
      const res = await fetch(`${apiBase}/bookings/feedbacks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải danh sách đánh giá');
      
      const data = await res.json();
      setFeedbacks(data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating) {
    if (!rating) return <span className="text-muted-foreground italic text-xs">Chưa đánh giá sao</span>;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={16} 
            weight={star <= rating ? 'fill' : 'regular'} 
            className={star <= rating ? 'text-amber-400' : 'text-slate-300'} 
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground font-medium">
        Tổng cộng: {feedbacks.length} lượt đánh giá
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-muted-foreground bg-muted/20">
          <ChatText size={48} className="mb-4 text-slate-300" weight="duotone" />
          <p>Chi nhánh chưa nhận được phản hồi hay đánh giá nào.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {feedbacks.map((fb) => (
            <div key={fb._id} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {fb.userId?.avatar ? (
                    <img src={fb.userId.avatar} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-border" />
                  ) : (
                    <UserCircle size={40} className="text-slate-300" weight="fill" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground text-sm">{fb.userId?.name || 'Khách vãng lai'}</span>
                      {fb.userId?.tier && <TierBadge tier={fb.userId.tier} />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(fb.updatedAt || fb.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                <div>{renderStars(fb.rating)}</div>
              </div>
              
              <div className="mb-4 text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md">
                Dịch vụ: {fb.packageId?.name || 'Gói cơ bản'}
              </div>

              <div className="flex-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                {fb.feedback ? `"${fb.feedback}"` : <span className="text-slate-400">Không có bình luận đi kèm.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
