import { useState } from 'react';
import { ImageOff, QrCode } from 'lucide-react';
import { resolveImageUrl } from '../api/chatApi';
import { formatAmount, formatTime } from '../utils/chatFormat';

// Thẻ tóm tắt mã VietQR đã được server giải mã: Ngân hàng | STK | Số tiền (docs/chat-spec.md mục 6).
function VietQrCard({ qrData }) {
  const bank = qrData.bankName || `Ngân hàng không xác định (BIN ${qrData.bankBin})`;
  const amount = formatAmount(qrData.amount);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <QrCode className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
        Mã QR chuyển khoản
      </p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-600">Ngân hàng:</dt>
          <dd className="font-semibold">{bank}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-600">STK:</dt>
          <dd className="font-mono font-semibold break-all">{qrData.accountNumber}</dd>
        </div>
        {amount && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Số tiền:</dt>
            <dd className="font-mono font-semibold">{amount}</dd>
          </div>
        )}
        {qrData.purpose && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Nội dung:</dt>
            <dd className="break-words">{qrData.purpose}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function ImageAttachment({ imageUrl }) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(imageUrl);

  if (!src || failed) {
    return (
      <p className="flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-600">
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        Không tải được ảnh.
      </p>
    );
  }

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh trong tab mới">
      <img
        src={src}
        alt="Ảnh được gửi trong cuộc trò chuyện"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-64 w-full max-w-xs rounded-xl object-contain"
      />
    </a>
  );
}

// Bong bóng tin nhắn. Tin của mình căn phải (nền hồng nhạt), của đối phương căn trái (nền xám nhạt).
export default function MessageBubble({ message, isMine }) {
  const isImage = message.type === 'image';
  const showQrCard = isImage && message.qrData?.isVietQR === true && message.qrData.accountNumber;
  const time = formatTime(message.createdAt);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        data-testid="message-bubble"
        data-mine={isMine ? 'true' : 'false'}
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[70%] ${
          isMine
            ? 'rounded-br-sm border border-brand-border bg-brand-soft text-slate-900'
            : 'rounded-bl-sm bg-slate-100 text-slate-900'
        }`}
      >
        {isImage && <ImageAttachment imageUrl={message.imageUrl} />}
        {showQrCard && <VietQrCard qrData={message.qrData} />}
        {/* Nội dung luôn hiển thị dạng văn bản thuần, không bao giờ render HTML hay tự biến thành link. */}
        {message.content && (
          <p className={`whitespace-pre-wrap break-words ${isImage ? 'mt-2' : ''}`}>{message.content}</p>
        )}
        {time && <p className="mt-1 text-right text-xs text-slate-600">{time}</p>}
      </div>
    </div>
  );
}
