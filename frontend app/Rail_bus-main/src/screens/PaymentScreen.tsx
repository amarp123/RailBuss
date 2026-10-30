import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Trip } from '../types';


export const PaymentScreen: React.FC = () => {
  const navigate=useNavigate();
  const location=useLocation();
  const {language,activeBookingFlow,refreshData}=useApp();
  const stateData=location.state as {trip?:Trip;seatCount?:number;destinationStopId?:string}|null;
  const trip=stateData?.trip;
  const seatCount=stateData?.seatCount||activeBookingFlow.seatCount||1;
  const destinationStopId=stateData?.destinationStopId||activeBookingFlow.destinationStopId;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  if(!trip){navigate('/');return null;}
  const destination=language==='kn'?trip.route.destinationNameKn:trip.route.destinationName;
  const totalFare=trip.route.fixedFare*seatCount;

  const pay = async () => {
    setBusy(true);setError('');
    try {
      const booking=await api.payForReservation(trip.id,destinationStopId,seatCount);
      await refreshData();
      navigate(`/tickets/${booking.id}`,{replace:true,state:{isNewBooking:true}});
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not start payment. Please retry.');
      setBusy(false);
    }
  };

  return <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-24 pt-20 px-4">
    <div className="flex items-center justify-between"><button onClick={()=>navigate('/book/seats',{state:{trip,destinationStopId}})} className="w-10 h-10 rounded-full bg-white border border-[#D9E1EA] flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-5 h-5"/></button><h1 className="font-bold text-xl text-[#0B1F33]">Pay & join waiting list</h1><div className="w-10"/></div>
    <section className="bg-white rounded-2xl p-5 border border-[#D9E1EA] shadow-sm space-y-4">
      <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-[#EBF2FA] grid place-items-center"><ShieldCheck className="w-5 h-5 text-[#0B1F33]"/></div><div><div className="font-bold text-[#0B1F33]">Mysuru Junction → {destination}</div><div className="text-xs text-[#74777d]">Train {trip.connectedTrainNumber||'registered'} · {trip.scheduledDepartureTime.slice(0,10)}</div></div></div>
      <div className="border-t border-dashed border-[#D9E1EA] pt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-[#74777d]">Seats requested</span><b>{seatCount}</b></div><div><span className="block text-xs text-[#74777d]">Total fare</span><b>₹{totalFare}</b></div></div>
      <div className="rounded-xl bg-[#EBF2FA] p-3 text-xs leading-relaxed">This MVP records your reservation as paid without charging real money. At 20 paid seats, Admin can approve dispatch; the bus holds up to 56 seats. Your QR ticket is generated after Admin dispatch. If dispatch is not approved before the demand deadline, the reservation is cancelled.</div>
      {error&&<div role="alert" className="p-3 rounded-xl bg-[#FDE8E8] text-xs text-[#D32F2F] flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
      <button disabled={busy} onClick={()=>void pay()} className="w-full h-[52px] rounded-xl font-bold bg-[#F5A524] text-[#0B1F33] flex items-center justify-center gap-2 disabled:opacity-50">{busy?<><Loader2 className="w-4 h-4 animate-spin"/>Recording payment…</>:<>Pay ₹{totalFare} · reserve {seatCount} seat{seatCount>1?'s':''}</>}</button>
      <p className="text-[10px] text-center text-[#74777d]">MVP direct payment · no payment gateway</p>
    </section>
  </div>;
};
