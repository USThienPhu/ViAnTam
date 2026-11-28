import { Briefcase, KeyRound, Lightbulb, QrCode, ShieldAlert, TrendingUp } from 'lucide-react';

const TIPS = [
  {
    title: 'Giả danh Công an / VNeID',
    Icon: ShieldAlert,
    signs: [
      'Gọi điện hoặc nhắn tin xưng là công an, viện kiểm sát, nói bạn liên quan tới một vụ án.',
      'Yêu cầu cài ứng dụng VNeID "mới" qua đường link hoặc file .apk.',
      'Đòi chuyển tiền vào "tài khoản tạm giữ" và yêu cầu giữ bí mật.',
    ],
    actions: [
      'Cơ quan công an không làm việc hay yêu cầu chuyển tiền qua điện thoại, tin nhắn.',
      'Chỉ cài VNeID từ App Store hoặc Google Play; gọi 113 hoặc đến trụ sở công an gần nhất để xác minh.',
    ],
  },
  {
    title: 'Giả danh MoMo / Ngân hàng đòi OTP',
    Icon: KeyRound,
    signs: [
      'Báo tài khoản có giao dịch bất thường hoặc sắp bị khóa.',
      'Gửi đường link có tên miền gần giống thật, ví dụ m0mo-xacminh.xyz.',
      'Hỏi mã OTP, mật khẩu hoặc yêu cầu đọc mã xác nhận.',
    ],
    actions: [
      'Không bao giờ cung cấp OTP, mật khẩu cho bất kỳ ai, kể cả người xưng là nhân viên.',
      'Liên hệ tổng đài in trên thẻ hoặc trong ứng dụng chính thức để kiểm tra.',
    ],
  },
  {
    title: 'Tuyển CTV online, nạp tiền nhận việc',
    Icon: Briefcase,
    signs: [
      'Việc nhẹ lương cao, làm tại nhà, "ngày kiếm 300k–500k".',
      'Phải ứng trước hoặc nạp tiền để nhận đơn, rút hoa hồng.',
      'Lần đầu được trả thưởng nhỏ để tạo lòng tin, sau đó bị yêu cầu nạp số tiền lớn hơn.',
    ],
    actions: [
      'Công việc thật không bắt bạn trả tiền để được làm việc.',
      'Dừng chuyển tiền ngay khi bị yêu cầu nạp thêm để "rút tiền về".',
    ],
  },
  {
    title: 'Đầu tư lãi khủng',
    Icon: TrendingUp,
    signs: [
      'Cam kết lợi nhuận cao, cố định, "không thể lỗ".',
      'Mời vào nhóm kín trên Telegram/Zalo có nhiều người "khoe lãi".',
      'Sàn hoặc ứng dụng lạ, không rõ pháp nhân.',
    ],
    actions: [
      'Kiểm tra giấy phép của đơn vị trên trang của Ủy ban Chứng khoán Nhà nước hoặc Ngân hàng Nhà nước.',
      'Không chuyển tiền cho cá nhân để "đầu tư hộ".',
    ],
  },
  {
    title: 'Mã QR giả mạo',
    Icon: QrCode,
    signs: [
      'Mã QR dán đè lên mã thật tại cửa hàng, hoặc gửi qua tin nhắn kèm lời hối thúc.',
      'Tên người nhận trên màn hình chuyển khoản không khớp với cửa hàng hay tổ chức.',
      'Số tiền hoặc nội dung chuyển khoản khác với những gì đã thỏa thuận.',
    ],
    actions: [
      'Luôn đọc kỹ tên người nhận và số tiền trước khi xác nhận chuyển.',
      'Dùng nút "Kiểm tra lừa đảo" trong AegisAI khi nhận mã QR từ người lạ.',
    ],
  },
];

export default function TipsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">Mẹo an toàn</h1>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Nhận biết 5 chiêu trò lừa đảo phổ biến tại Việt Nam và cách xử lý khi gặp phải.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TIPS.map(({ title, Icon, signs, actions }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-brand-soft p-2 text-brand-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Dấu hiệu nhận biết</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
              {signs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Cách xử lý</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
              {actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Nếu đã lỡ chuyển tiền, hãy liên hệ ngay ngân hàng hoặc ví điện tử để yêu cầu phong tỏa giao dịch và trình báo cơ
        quan công an.
      </p>
    </div>
  );
}
