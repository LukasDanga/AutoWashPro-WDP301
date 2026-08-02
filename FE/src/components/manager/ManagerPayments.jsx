import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CurrencyDollar, ArrowUUpLeft } from '@phosphor-icons/react';
import AdminPayments from '@/components/admin/AdminPayments';
import RefundRequests from '@/components/shared/RefundRequests';

const TABS = [
  { key: 'payments', label: 'Quản lý thanh toán', icon: CurrencyDollar, activeColor: 'border-emerald-600 text-emerald-600' },
  { key: 'refunds', label: 'Yêu cầu hoàn tiền', icon: ArrowUUpLeft, activeColor: 'border-emerald-600 text-emerald-600' },
];

export default function ManagerPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'payments');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) setActiveTab(tab);
    if (!tab && activeTab !== 'payments') setActiveTab('payments');
  }, [searchParams]); // eslint-disable-line

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon, activeColor }) => (
          <button
            key={key}
            onClick={() => setSearchParams(key === 'payments' ? {} : { tab: key })}
            className={`inline-flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === key ? activeColor : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={16} weight="duotone" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'refunds' ? (
        <RefundRequests />
      ) : (
        <AdminPayments showDelete={false} detailPath="/manager/payments" />
      )}
    </div>
  );
}
