import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Bell, CheckCircle, Bus, Clock, ShieldAlert } from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { language, notifications, markNotificationRead } = useApp();
  const markedVisible = useRef(new Set<string>());

  useEffect(() => {
    notifications.filter((item) => !item.read && !markedVisible.current.has(item.id)).forEach((item) => {
      markedVisible.current.add(item.id);
      markNotificationRead(item.id);
    });
  }, [notifications, markNotificationRead]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'TRIP_APPROVED':
        return <CheckCircle className="w-5 h-5 text-[#0B7A55]" />;
      case 'BUS_ASSIGNED':
        return <Bus className="w-5 h-5 text-[#0B1F33]" />;
      case 'THRESHOLD_REACHED':
        return <Clock className="w-5 h-5 text-[#B76E00]" />;
      case 'WAITING_DISPATCH':
        return <Clock className="w-5 h-5 text-[#B76E00]" />;
      case 'TICKET_CONFIRMED':
        return <CheckCircle className="w-5 h-5 text-[#0B7A55]" />;
      case 'SERVICE_CANCELLED':
        return <ShieldAlert className="w-5 h-5 text-[#D32F2F]" />;
      default:
        return <Bell className="w-5 h-5 text-[#0B1F33]" />;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-28 pt-20 px-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-[#D9E1EA] flex items-center justify-center text-[#0B1F33] active:scale-95 transition-transform shadow-sm"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl text-[#0B1F33] tracking-tight">
          Notifications
        </h1>
        <div className="w-10" />
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notif) => {
          const title = language === 'kn' ? notif.titleKn : notif.title;
          const msg = language === 'kn' ? notif.messageKn : notif.message;

          return (
            <div
              key={notif.id}
              onClick={() => {
                markNotificationRead(notif.id);
                if (notif.tripId) navigate('/tickets');
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-2 ${
                notif.read ? 'bg-white border-[#D9E1EA]' : 'bg-[#EBF2FA] border-[#0B1F33]/20 ring-1 ring-[#0B1F33]/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#D9E1EA] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#0B1F33] leading-tight">{title}</h3>
                    <span className="text-[10px] text-[#74777d]">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#44474c] leading-relaxed">{msg}</p>
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && <div className="rounded-2xl border border-[#D9E1EA] bg-white p-6 text-center text-sm text-[#74777d]">Payment, dispatch, ticket, and cancellation updates will appear here.</div>}
      </div>
    </div>
  );
};
