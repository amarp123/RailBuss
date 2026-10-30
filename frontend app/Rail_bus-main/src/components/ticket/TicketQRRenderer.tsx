import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Booking } from '../../types';
import { useApp } from '../../context/AppContext';
import { makeTicketQrDataUrl } from '../../services/api';

interface TicketQRRendererProps {
  booking: Booking;
  isUsed?: boolean;
}

export const TicketQRRenderer: React.FC<TicketQRRendererProps> = ({ booking, isUsed = false }) => {
  const { t, language } = useApp();
  const ticket = booking.ticket;
  const [qrDataUrl, setQrDataUrl] = useState(ticket?.qrDataUrl || '');
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';
  const refundPending = booking.paymentStatus === 'REFUND_PENDING';
  const isWaiting = booking.status === 'WAITING_DISPATCH';

  const destName = language === 'kn' ? booking.destinationStop.stopNameKn || booking.destinationStop.stopName : booking.destinationStop.stopName;
  const departureDate = new Date(booking.trip.scheduledDepartureTime);

  useEffect(() => {
    let active = true;
    setQrDataUrl(ticket?.qrDataUrl || '');
    if (ticket?.qrSignature) void makeTicketQrDataUrl(ticket.qrSignature).then((data) => { if (active) setQrDataUrl(data); }).catch(() => {});
    return () => { active = false; };
  }, [ticket?.qrDataUrl, ticket?.qrSignature]);

  return (
    <div className="relative w-full rounded-2xl bg-white border border-[#D9E1EA] shadow-[0_4px_20px_rgba(11,31,51,0.06)] overflow-hidden">
      {/* 4px Amber Accent Top Edge */}
      <div className="w-full h-1.5 bg-[#F5A524]" />

      {/* TOP HALF: Transit Details */}
      <div className="p-5 pt-4">
        {/* Status Pill at Top */}
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full bg-[#EBF2FA] text-[#0B1F33] font-bold text-xs uppercase tracking-wider">
            KSRTC Feeder
          </span>
          {isCancelled ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE8E8] text-[#D32F2F]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{refundPending ? 'Cancelled · payment review' : 'Cancelled'}</span>
            </div>
          ) : isWaiting ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4E5] text-[#B76E00]"><AlertTriangle className="w-3.5 h-3.5"/><span className="text-xs font-bold">Paid · waiting for dispatch</span></div>
          ) : isUsed ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E1E9F2] text-[#44474c]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{t.ticket.alreadyUsed}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#0B7A55]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">Verified by Server</span>
            </div>
          )}
        </div>

        {/* Departure Time & Destination */}
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#0B1F33] font-mono tracking-tight">
              {booking.trip.connectedTrainNumber ? `Train ${booking.trip.connectedTrainNumber}` : 'Mysuru Junction'}
            </span>
            <span className="text-[#74777d] text-sm">&rarr;</span>
            <span className="text-lg font-bold text-[#0B1F33]">{destName}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#EBF2FA] text-[#0B1F33] font-semibold text-xs tracking-wider">
            {'Route service'}
          </span>
        </div>
        <p className="text-xs text-[#74777d] mb-4">
          Mysuru Junction to {destName}
        </p>
        <p className={`text-xs font-semibold mb-3 ${booking.trip.status === 'CANCELLED' ? 'text-[#D32F2F]' : isWaiting ? 'text-[#B76E00]' : 'text-[#0B7A55]'}`}>
          {booking.trip.status === 'CANCELLED' ? 'Service unavailable · reservation cancelled' : isWaiting ? `${booking.trip.confirmedBookingsCount} / ${booking.trip.capacity} seats reserved · Admin dispatch pending (minimum ${booking.trip.targetThreshold})` : 'Bus dispatch confirmed · ticket active'}
        </p>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-[#F3F6FA] text-xs">
          <div>
            <span className="block text-[10px] font-semibold text-[#74777d] uppercase tracking-wider">{t.ticket.dateLabel}</span>
            <span className="font-semibold text-[#0B1F33]">{Number.isNaN(departureDate.getTime()) ? 'Date pending' : departureDate.toLocaleDateString()}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#74777d] uppercase tracking-wider">{t.ticket.seatsLabel}</span>
            <span className="font-semibold text-[#0B1F33]">{booking.seatCount} Seat{booking.seatCount > 1 ? 's' : ''}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#74777d] uppercase tracking-wider">Paid fare</span>
            <span className="font-bold text-[#0B1F33] font-mono">₹{booking.totalFarePaid}</span>
          </div>
        </div>
      </div>

      {/* NOTCHED TICKET CUTOUT WITH DOTTED TRACK */}
      <div className="relative w-full h-6 flex items-center bg-white">
        {/* Left Cutout Notch */}
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-[#F3F6FA] border-r border-[#D9E1EA]" />
        {/* Crisp Dotted Center Track */}
        <div className="w-full mx-5 border-b border-dashed border-[#D9E1EA]" />
        {/* Right Cutout Notch */}
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-[#F3F6FA] border-l border-[#D9E1EA]" />
      </div>

      {/* BOTTOM HALF: QR Code & Verification */}
      <div className="px-5 pt-3 pb-6 flex flex-col items-center text-center bg-white">
        {/* QR Container Wrapper */}
        {isWaiting ? <div className="w-full rounded-2xl bg-[#FFF4E5] border border-[#F5A524]/50 p-5 text-center space-y-2"><AlertTriangle className="w-7 h-7 mx-auto text-[#B76E00]"/><b className="block text-sm text-[#0B1F33]">Reservation paid · waiting for bus dispatch</b><p className="text-xs text-[#44474c]">The service becomes dispatch-ready at 20 seats and can accept up to 56. We will issue your QR ticket after Admin approves dispatch.</p></div> : <div className="relative p-3 rounded-2xl bg-white border border-[#D9E1EA] shadow-sm mb-3">
          {qrDataUrl ? <img src={qrDataUrl} alt={`Scannable ticket QR ${ticket?.ticketCode}`} className={`w-[180px] h-[180px] object-contain ${isCancelled || isUsed ? 'opacity-25' : ''}`} /> : <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-2 text-center text-xs text-[#74777d] px-4"><AlertTriangle className="w-6 h-6 text-[#B76E00]" /><span>{ticket ? 'Preparing your secure QR ticket…' : 'Your scannable QR ticket will appear after Admin dispatch.'}</span></div>}
          <svg 
            style={{ display: 'none' }}
            className={`w-[180px] h-[180px] text-[#0B1F33] transition-opacity duration-200 ${isCancelled || isUsed ? 'opacity-25' : ''}`}
            viewBox="0 0 160 160" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="160" height="160" fill="#FFFFFF" />
            {/* Finder Pattern Top-Left */}
            <rect x="12" y="12" width="40" height="40" rx="3" fill="currentColor" />
            <rect x="18" y="18" width="28" height="28" fill="#FFFFFF" />
            <rect x="24" y="24" width="16" height="16" fill="currentColor" />
            {/* Finder Pattern Top-Right */}
            <rect x="108" y="12" width="40" height="40" rx="3" fill="currentColor" />
            <rect x="114" y="18" width="28" height="28" fill="#FFFFFF" />
            <rect x="120" y="24" width="16" height="16" fill="currentColor" />
            {/* Finder Pattern Bottom-Left */}
            <rect x="12" y="108" width="40" height="40" rx="3" fill="currentColor" />
            <rect x="18" y="114" width="28" height="28" fill="#FFFFFF" />
            <rect x="24" y="120" width="16" height="16" fill="currentColor" />
            {/* Timing & Data Tracks */}
            <path d="M58 20h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm0 12h6v6h-6zm-12 12h6v6h-6zm-12 0h6v6h-6zm-18 12h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6z" fill="currentColor" />
            <path d="M20 58h6v6h-6zm0 12h6v6h-6zm0 12h6v6h-6zm12 12h6v6h-6zm24-24h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm0-12h6v6h-6zm12 12h6v6h-6zm12 0h6v6h-6zm-24 12h6v6h-6zm12 0h6v6h-6zm-36 0h6v6h-6zm0 12h6v6h-6zm12 12h6v6h-6zm12 0h6v6h-6zm24 0h6v6h-6z" fill="currentColor" />
            <path d="M58 108h6v6h-6zm12 0h6v6h-6zm0 12h6v6h-6zm12 0h6v6h-6zm0 12h6v6h-6zm12-12h6v6h-6zm12 0h6v6h-6zm12 12h6v6h-6zm-24 12h6v6h-6zm24 0h6v6h-6zm12 0h6v6h-6zm-36 12h6v6h-6zm12 0h6v6h-6zm24 0h6v6h-6zm-72-12h6v6h-6zm12 0h6v6h-6zm-12 12h6v6h-6z" fill="currentColor" />
            <path d="M96 28h8v8h-8zm0 16h8v8h-8zm-28 64h8v8h-8zm16 16h8v8h-8zm32-40h8v8h-8zm0 16h8v8h-8zm-16 0h8v8h-8zm32 16h8v8h-8z" fill="currentColor" />
          </svg>

          {/* Watermark Overlay for used or cancelled state */}
          {(isCancelled || isUsed) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-2xl">
              <div className={`px-4 py-2 rounded-xl border-2 font-bold text-lg tracking-widest uppercase rotate-[-12deg] shadow-sm ${
                isCancelled ? 'border-[#D32F2F] text-[#D32F2F] bg-[#FDE8E8]' : 'border-[#0B1F33] text-[#0B1F33] bg-[#E1E9F2]'
              }`}>
                {isCancelled ? 'CANCELLED' : 'USED'}
              </div>
            </div>
          )}
        </div>}

        {/* Ticket Code with High Legibility Tracking */}
        <div className="font-mono text-2xl font-bold text-[#0B1F33] tracking-[0.16em] mb-1 select-all">
          {ticket ? ticket.ticketCode : isWaiting ? 'TICKET AFTER DISPATCH' : 'BOOKING CANCELLED'}
        </div>

        {/* Conductor Instruction */}
        <p className="text-xs text-[#74777d] font-medium max-w-xs">
          {isCancelled ? 'This reservation was cancelled because demand did not reach 20 seats. The MVP does not process real payments or refunds.' : isWaiting ? 'This is a paid reservation confirmation, not a boarding pass. The QR ticket is generated only after Admin dispatch.' : t.ticket.conductorInstruction}
        </p>

        {/* Offline Status Footer Note */}
        <div className="flex items-center gap-1.5 mt-4 text-[11px] text-[#74777d] bg-[#F3F6FA] px-3 py-1.5 rounded-full border border-[#D9E1EA]">
          <WifiOff className="w-3.5 h-3.5 text-[#74777d]" />
          <span>{isWaiting ? 'Notifications will update this booking automatically' : t.ticket.offlineReady}</span>
        </div>
      </div>
    </div>
  );
};
