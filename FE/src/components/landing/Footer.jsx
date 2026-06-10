export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <span className="text-xl font-bold tracking-tight text-slate-800">
              Auto<span className="text-emerald-600">Wash</span>Pro
            </span>
            <p className="text-slate-400 mt-4 max-w-md leading-relaxed text-sm">
              Hệ thống đặt lịch rửa xe thông minh. Giúp bạn tiết kiệm thời gian
              và giữ xe luôn sạch sẽ.
            </p>
          </div>

          <div>
            <h4 className="text-slate-800 text-sm font-semibold mb-4">Dịch vụ</h4>
            <ul className="space-y-3">
              {['Rửa xe cơ bản', 'Rửa xe cao cấp', 'Phủ ceramic', 'Vệ sinh nội thất'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-400 text-sm hover:text-slate-600 transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-slate-800 text-sm font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-3">
              {['Trung tâm trợ giúp', 'Liên hệ', 'Điều khoản sử dụng', 'Chính sách bảo mật'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-400 text-sm hover:text-slate-600 transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} AutoWashPro. Mọi quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-6">
            {['Facebook', 'Instagram', 'YouTube'].map((social) => (
              <a key={social} href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors duration-200">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
