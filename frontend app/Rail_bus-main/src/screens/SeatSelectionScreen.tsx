import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Clock, MapPin, ArrowRight } from 'lucide-react';
import { SeatStepper } from '../components/booking/SeatStepper';
import { Trip } from '../types';

export const SeatSelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, activeBookingFlow, updateBookingFlow, trips } = useApp();

  const passedTrip = (location.state as any)?.trip as Trip | undefined;
  const currentTrip = passedTrip || trips.find((t) => t.id === activeBookingFlow.selectedTripId) || trips[0];

  const [seatCount, setSeatCount] = useState<number>(activeBookingFlow.seatCount || 1);

  if (!currentTrip) {
    navigate('/book/buses');
    return null;
  }

  const destName = language === 'kn' ? currentTrip.route.destinationNameKn : currentTrip.route.destinationName;
  const totalFare = seatCount * currentTrip.route.fixedFare;

  const handleProceedToPayment = () => {
    updateBookingFlow({
      selectedTripId: currentTrip.id,
      seatCount,
    });
    navigate('/book/pay', { state: { trip: currentTrip, seatCount, totalFare } });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-24 pt-20 px-4">
      {/* Top Bar with Back Arrow */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/book/buses')}
          className="w-10 h-10 rounded-full bg-white border border-[#D9E1EA] flex items-center justify-center text-[#0B1F33] active:scale-95 transition-transform shadow-sm"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl text-[#0B1F33] tracking-tight">
          {t.seats.title}
        </h1>
        <div className="w-10" />
      </div>

      {/* Selected Trip Capsule */}
      <div className="bg-[#0B1F33] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#F5A524] font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Train {currentTrip.connectedTrainNumber || 'registered'} · {currentTrip.scheduledDepartureTime.slice(0, 10)}</span>
          </div>
          <div className="flex items-center gap-1 text-base font-bold">
            <MapPin className="w-4 h-4 text-[#F5A524]" />
            <span>{destName}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#A0B0C0] block">Fixed Fare</span>
          <span className="text-xl font-bold font-mono text-white">₹{currentTrip.route.fixedFare}</span>
        </div>
      </div>

      {/* Seat Stepper Component */}
      <SeatStepper
        value={seatCount}
        min={1}
        max={6}
        unitFare={currentTrip.route.fixedFare}
        onChange={(val) => setSeatCount(val)}
      />

      {/* Primary CTA Action */}
      <div className="pt-4">
        <button
          type="button"
          onClick={handleProceedToPayment}
          className="w-full h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all bg-[#F5A524] text-[#0B1F33] shadow-sm active:scale-95 cursor-pointer"
        >
          <span>Continue to ticket · ₹{totalFare}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
