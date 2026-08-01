import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoyaltyConfigTab from './config-tabs/LoyaltyConfigTab';
import SystemConfigGeneric from './config-tabs/SystemConfigGeneric';
import { Gear, Money, Gift, Tag } from '@phosphor-icons/react';

const PROMOTION_KEYS = [
  'SLOT_PACK_DISCOUNTS',
  'SLOT_PACK_VIP_BONUS_DISCOUNTS',
  'BIRTHDAY_VOUCHER_PERCENT',
  'BIRTHDAY_VOUCHER_MAX_AMOUNT',
  'BIRTHDAY_VOUCHER_VALIDITY_DAYS',
];

const OPERATIONS_CATEGORIES = ['general', 'booking'];
const PAYMENT_CATEGORIES = ['payment', 'finance'];
const PROMOTION_CATEGORIES = ['general', 'booking', 'promotion'];
const OPERATIONS_EXCLUDE_KEYS = [...PROMOTION_KEYS, 'ADVANCE_BOOKING_LIMITS'];

export default function AdminSystemConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'operations');

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'operations', label: 'Vận hành & Booking', icon: Gear, categories: OPERATIONS_CATEGORIES },
    { id: 'payments', label: 'Thanh toán & Huỷ', icon: Money, categories: PAYMENT_CATEGORIES },
    { id: 'promotion', label: 'Khuyến mãi & Ưu đãi', icon: Tag, keys: PROMOTION_KEYS },
    { id: 'loyalty', label: 'Hạng thành viên & Điểm', icon: Gift }
  ];

  return (
    <div className="flex h-full w-full flex-col bg-slate-50">
      {/* Sub-navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-8 py-3 shadow-2xs">
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 border-b-2 pb-3 px-1 text-sm font-semibold transition-colors ${
                  isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'operations' && (
          <SystemConfigGeneric
            categories={OPERATIONS_CATEGORIES}
            excludeKeys={OPERATIONS_EXCLUDE_KEYS}
          />
        )}
        {activeTab === 'payments' && <SystemConfigGeneric categories={PAYMENT_CATEGORIES} />}
        {activeTab === 'promotion' && <SystemConfigGeneric categories={PROMOTION_CATEGORIES} keys={PROMOTION_KEYS} />}
        {activeTab === 'loyalty' && <LoyaltyConfigTab />}
      </div>
    </div>
  );
}
