import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Ticket as TicketIcon, ChevronRight, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Booking } from '../types';

export const BookingHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, bookings } = useApp();

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#0B7A55] text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Confirmed</span>
          </span>
        );
      case 'WAITING_DISPATCH':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#B76E00] text-xs font-bold"><Clock className="w-3.5 h-3.5"/><span>Paid · waiting for dispatch</span></span>;
      case 'BOARDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF2FA] text-[#0B1F33] text-xs font-bold">
            <span>Boarded</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDE8E8] text-[#D32F2F] text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'REFUNDED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#0B7A55] text-xs font-bold"><CheckCircle className="w-3.5 h-3.5"/><span>Cancelled · refunded</span></span>;
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#B76E00] text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-28 pt-20 px-4">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl text-[#0B1F33] tracking-tight">
          {t.nav.tickets}
        </h1>
        <button
          onClick={() => navigate('/')}
          className="h-9 px-3 rounded-xl bg-[#0B1F33] text-[#F5A524] text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Book New</span>
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#D9E1EA] text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#F3F6FA] flex items-center justify-center text-[#74777d] mx-auto">
              <TicketIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0B1F33]">No tickets yet</h3>
            <p className="text-xs text-[#74777d] max-w-xs mx-auto">
              Your signed tickets and route demand confirmation appear here.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-4 py-2.5 rounded-xl bg-[#F5A524] text-[#0B1F33] text-xs font-bold active:scale-95"
            >
              Register train and destination
            </button>
          </div>
        ) : (
          bookings.map((booking) => {
            const destName = language === 'kn' ? booking.destinationStop.stopNameKn || booking.destinationStop.stopName : booking.destinationStop.stopName;

            return (
              <div
                key={booking.id}
                onClick={() => navigate(`/tickets/${booking.id}`)}
                className="bg-white rounded-2xl p-4 border border-[#D9E1EA] shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[#74777d] uppercase tracking-wider font-mono">
                      {booking.ticket?.ticketCode || (booking.status === 'WAITING_DISPATCH' ? 'PAID WAITLIST' : 'BOOKING')}
                    </span>
                    <h3 className="font-bold text-base text-[#0B1F33]">
                      Mysuru &rarr; {destName}
                    </h3>
                    <p className="text-xs text-[#74777d]">
                      {booking.trip.scheduledDepartureTime ? new Date(booking.trip.scheduledDepartureTime).toLocaleDateString() : 'Date pending'} · {booking.seatCount} Seat{booking.seatCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-mono text-base font-bold text-[#0B1F33] block">
                      ₹{booking.totalFarePaid}
                    </span>
                    <span className="text-[9px] text-[#74777d] block">{booking.status === 'WAITING_DISPATCH' || booking.status === 'CONFIRMED' ? 'paid' : 'payment status'}</span>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D9E1EA]/60 flex items-center justify-between text-xs text-[#0B1F33] font-semibold">
                  <span>{booking.ticket ? 'View confirmed ticket & QR' : 'View reservation status'}</span>
                  <ChevronRight className="w-4 h-4 text-[#74777d]" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
