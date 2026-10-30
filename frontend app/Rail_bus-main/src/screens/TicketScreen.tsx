import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Share2, Download, PlusCircle, CheckCircle2 } from 'lucide-react';
import { TicketQRRenderer } from '../components/ticket/TicketQRRenderer';
import { Booking } from '../types';

export const TicketScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, bookings } = useApp();

  const [copyFeedback, setCopyFeedback] = useState('');

  // Find requested booking or default to most recent
  const activeBooking = bookings.find((b) => b.id === id) || bookings[0];

  const isUsedState = activeBooking?.status === 'BOARDED';

  if (!activeBooking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <p className="text-sm text-[#74777d]">No active ticket found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-[#0B1F33] text-white text-xs font-bold"
        >
          Book a Bus
        </button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `RailBus Ticket: ${activeBooking.ticket?.ticketCode || 'Pass'}`,
        text: `RailBus boarding pass for ${activeBooking.destinationStop.stopName} at ${activeBooking.trip.departureTimeDisplay}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(activeBooking.ticket?.ticketCode || '');
      setCopyFeedback('Ticket code copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 2500);
    }
  };

  const handleSaveToPhone = () => {
    const dataUrl = activeBooking.ticket?.qrDataUrl;
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeBooking.ticket?.ticketCode || 'railbus-ticket'}.png`;
      link.click();
      setCopyFeedback('Ticket QR downloaded. It is also saved for offline viewing.');
    } else {
      void navigator.clipboard?.writeText(activeBooking.ticket?.ticketCode || '').catch(() => {});
      setCopyFeedback('Ticket reference copied. It is also saved for offline viewing.');
    }
    setTimeout(() => setCopyFeedback(''), 2500);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-28 pt-20 px-4">
      {/* Top Bar with Title and Back/Close */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tickets')}
          className="w-10 h-10 rounded-full bg-white border border-[#D9E1EA] flex items-center justify-center text-[#0B1F33] active:scale-95 transition-transform shadow-sm"
          title="Back to Tickets"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl text-[#0B1F33] tracking-tight">
          {t.ticket.title}
        </h1>
        <div className="w-10" />
      </div>

      {/* Main Boarding Pass Card Component */}
      <TicketQRRenderer booking={activeBooking} isUsed={isUsedState} />

      {/* Copy / Save Feedback Toast */}
      {copyFeedback && (
        <div className="p-3 bg-[#E6F4EA] border border-[#0B7A55]/30 rounded-xl text-xs font-semibold text-[#0B7A55] text-center flex items-center justify-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Active Ticket Utility Actions */}
      {!isUsedState && activeBooking.status !== 'CANCELLED' && activeBooking.status !== 'REFUNDED' && activeBooking.status !== 'WAITING_DISPATCH' && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleSaveToPhone}
            className="h-12 px-3 rounded-xl border border-[#D9E1EA] bg-white text-[#0B1F33] font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#F3F6FA] active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-[#0B1F33]" />
            <span>{t.ticket.saveBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-12 px-3 rounded-xl border border-[#D9E1EA] bg-white text-[#0B1F33] font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#F3F6FA] active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4 text-[#0B1F33]" />
            <span>{t.ticket.shareBtn}</span>
          </button>
        </div>
      )}

      {/* Used / Cancelled State Action: Book Another Trip */}
      {(isUsedState || activeBooking.status === 'CANCELLED' || activeBooking.status === 'REFUNDED') && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl bg-[#0B1F33] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4 text-[#F5A524]" />
            <span>{t.ticket.bookAnother}</span>
          </button>
        </div>
      )}

      {/* Secondary Actions: Cancellation & Alternatives */}
      <div className="pt-2 flex flex-col items-center space-y-2 text-xs">
        <button
          type="button"
          onClick={() => navigate('/alternatives')}
          className="text-[#74777d] hover:text-[#0B1F33] font-medium p-1"
        >
          {t.ticket.viewAlternatives} &rarr;
        </button>
      </div>
    </div>
  );
};
