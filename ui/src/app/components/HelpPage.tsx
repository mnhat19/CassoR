import { BookOpen, Upload, CreditCard, Download, Compass, MapPin, Radar, ExternalLink } from 'lucide-react';

const SECTIONS = [
  {
    icon: Compass,
    title: 'Khám phá lộ trình',
    color: '#007E47',
    steps: [
      'Chọn nhóm chuyên môn từ danh sách bên trái (ví dụ: Engineering, Data, Product…)',
      'Nhấn vào một chuyên môn để xem sơ đồ lộ trình đầy đủ.',
      'Sơ đồ hiển thị 3 hướng phát triển: Professional (kỹ thuật), Management (quản lý), Leadership (lãnh đạo).',
      'Nhấn vào mỗi ô chức danh để xem mô tả công việc và yêu cầu năng lực.',
    ],
  },
  {
    icon: MapPin,
    title: 'Nghề nghiệp của tôi',
    color: '#007E47',
    steps: [
      'Nhập chức danh hiện tại của bạn vào ô "Nhập chức danh" — hệ thống tự động nhận diện vị trí.',
      'Xem lộ trình cá nhân: vị trí hiện tại được đánh dấu, các bước tiếp theo được gợi ý.',
      'Xem "Tiền lệ thăng chức" để biết những người đã đi con đường tương tự.',
      'Nhấn vào từng chức danh để đọc yêu cầu cụ thể cần đạt được.',
    ],
  },
  {
    icon: Radar,
    title: 'Talent Radar — Dữ liệu nội bộ (Demo)',
    color: '#007E47',
    steps: [
      'Xem phân tích tổng quan nhân sự dựa trên dữ liệu demo của hệ thống.',
      'Kim tự tháp nhân sự: phân bố theo cấp độ và track của toàn bộ tổ chức.',
      'Cảnh báo chững lại: nhân sự ở mức trần quá lâu, có nguy cơ nghỉ việc.',
      'Phân tích phụ thuộc: tỷ lệ tuyển ngoài vs. đào tạo nội bộ theo từng mảng.',
    ],
  },
  {
    icon: Upload,
    title: 'Talent Radar — Phân tích dữ liệu của bạn',
    color: '#B45309',
    steps: [
      'Tải template mẫu (.xlsx hoặc .csv) từ link trong trang, điền dữ liệu nhân sự thực của công ty.',
      'Kéo thả hoặc nhấn chọn file đã điền → hệ thống kiểm tra cấu trúc và tạo lệnh thanh toán.',
      'Chuyển khoản đúng 3.000đ đến tài khoản được hiển thị, nội dung ghi đúng mã tham chiếu CSRxxxxxxxx.',
      'Sau khi thanh toán được xác nhận (tự động qua app merchant), nhấn "Tải báo cáo" để nhận file phân tích Excel.',
    ],
  },
];

const FAQ = [
  {
    q: 'Cột nào trong file upload là bắt buộc?',
    a: 'Chỉ cần 2 cột: "Mã NV" (hoặc ID) và "Chức danh" (hoặc Title). Các cột còn lại là tùy chọn giúp phân tích sâu hơn.',
  },
  {
    q: 'Chức danh cần viết như thế nào?',
    a: 'Viết tiếng Anh theo chuẩn ngành, ví dụ: "Junior Software Engineer", "Senior Data Analyst", "Engineering Manager". Hệ thống nhận diện tự động bằng fuzzy matching.',
  },
  {
    q: 'Báo cáo có được lưu lại không?',
    a: 'Không. Dữ liệu và báo cáo chỉ tồn tại trong bộ nhớ tạm (30 phút). Sau khi tải về, không thể tải lại — đây là thiết kế để bảo mật dữ liệu của bạn.',
  },
  {
    q: 'Thanh toán xong mà chưa thấy nút Tải báo cáo?',
    a: 'Nhấn nút "Tôi đã chuyển khoản" rồi chờ 5–10 giây. Hệ thống tự động kiểm tra. Nếu vẫn không có, liên hệ merchant để xác nhận thủ công.',
  },
  {
    q: 'Talent Radar yêu cầu quyền truy cập gì?',
    a: 'Tính năng Talent Radar (cả demo và upload trả phí) chỉ hiển thị với tài khoản có vai trò HR hoặc Leadership.',
  },
];

export function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto py-2 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)' }}>
            Hướng dẫn sử dụng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng quan các tính năng và cách sử dụng CASSOR HRM Platform.
          </p>
        </div>
      </div>

      {/* Feature guides */}
      <div className="space-y-5">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border" style={{ background: 'var(--muted)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: section.color }}>
                  <Icon size={14} color="white" />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--foreground)' }}>{section.title}</span>
              </div>
              <ol className="px-5 py-4 space-y-2.5 list-decimal list-inside">
                {section.steps.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.75 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {/* Payment flow diagram */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-emerald-700" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--foreground)' }}>Luồng thanh toán Talent Radar</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { icon: Upload, label: 'Upload file HR' },
            { icon: CreditCard, label: 'Chuyển khoản 3.000đ' },
            { icon: Radar, label: 'App merchant xác nhận' },
            { icon: Download, label: 'Tải báo cáo Excel' },
          ].map((step, i, arr) => (
            <span key={step.label} className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-medium shadow-sm">
                <step.icon size={12} />
                {step.label}
              </span>
              {i < arr.length - 1 && <span className="text-emerald-400 font-bold">→</span>}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Nội dung chuyển khoản phải ghi đúng mã tham chiếu dạng <code className="bg-emerald-100 text-emerald-800 px-1 rounded">CSRxxxxxxxx</code> được hiển thị trên màn hình.
        </p>
      </div>

      {/* FAQ */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12 }}>Câu hỏi thường gặp</h2>
        <div className="space-y-3">
          {FAQ.map(item => (
            <div key={item.q} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.q}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pb-4">
        <ExternalLink size={12} />
        <span>Mã nguồn & tài liệu kỹ thuật:</span>
        <a
          href="https://github.com/mnhat19/CassoR"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
        >
          github.com/mnhat19/CassoR
        </a>
      </div>
    </div>
  );
}
