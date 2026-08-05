import AdminSystemConfig from '@/components/admin/AdminSystemConfig';

export default function ManagerSystemConfig() {
  return (
    <div className="h-full w-full">
      <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">i</div>
        <p className="text-sm text-blue-800">
          <strong>Chế độ xem:</strong> Bạn đang xem cấu hình hệ thống (Business Rules). Chỉ Admin mới có quyền thay đổi các thông số này.
        </p>
      </div>
      <div className="h-[calc(100%-65px)]">
        <AdminSystemConfig readOnly={true} />
      </div>
    </div>
  );
}
