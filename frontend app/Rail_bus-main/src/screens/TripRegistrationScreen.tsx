import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AlertCircle, ArrowRight, Bus, Clock3, Info, Loader2, Search, Train } from 'lucide-react';
import { api, ServiceOption } from '../services/api';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };

export const TripRegistrationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, routes, activeBookingFlow, updateBookingFlow, dataError } = useApp();
  const [destination, setDestination] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [travelDate, setTravelDate] = useState(today());
  const [results, setResults] = useState<ServiceOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState('');

  const destinations = useMemo(() => [...new Set(routes.flatMap(route => route.stops.map(stop => stop.stopName.trim())).filter(Boolean))].sort((a,b)=>a.localeCompare(b)), [routes]);

  const search = async (silent = false) => {
    if (!destination || !trainNumber.trim() || !travelDate) return;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const items = await api.searchServices(destination, trainNumber.trim(), travelDate);
      setResults(items);
      setSearched(true);
      if (!silent && items.length === 0) setError('No bus route in the project dataset serves this stop. Try another destination.');
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : 'Could not search available routes.');
    } finally { if (!silent) setBusy(false); }
  };

  useEffect(() => {
    if (!searched) return;
    const timer = window.setInterval(() => { void search(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [searched, destination, trainNumber, travelDate]);

  const selectService = async (option: ServiceOption) => {
    if (option.seatsRemaining < 1 || option.status !== 'AVAILABLE' && option.status !== 'AGGREGATING') return;
    setSelecting(option.route.id); setError('');
    try {
      const trip = await api.resolveTrip(option.route.id, option.destinationStop.id, trainNumber.trim(), travelDate);
      updateBookingFlow({ destinationStopId: option.destinationStop.id, selectedTripId: trip.id, boardingStop: 'Mysuru Junction (Railway Station)', seatCount: 1 });
      navigate('/book/seats', { state: { trip, destinationStopId: option.destinationStop.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That service is no longer available. Search again.');
      await search(true);
    } finally { setSelecting(''); }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-24 pt-20 px-4">
      <div className="space-y-1"><h1 className="font-bold text-2xl text-[#0B1F33] tracking-tight">{t.registration.title}</h1><p className="text-sm text-[#74777d]">Search route services for your train arrival.</p></div>
      <form onSubmit={e=>{e.preventDefault();setResults([]);setSearched(false);void search();}} className="bg-white rounded-2xl p-5 border border-[#D9E1EA] shadow-sm space-y-4">
        <div className="rounded-xl bg-[#F3F6FA] border border-[#D9E1EA] p-3 flex items-center gap-3"><Train className="w-5 h-5 text-[#0B1F33]"/><div><div className="text-[10px] font-bold uppercase tracking-wider text-[#74777d]">Boarding point · fixed</div><div className="text-sm font-semibold">Mysuru Junction (Railway Station)</div></div></div>
        <div className="space-y-1.5"><label htmlFor="train-number" className="block text-xs font-bold uppercase tracking-wider">Train number</label><input id="train-number" required value={trainNumber} onChange={e=>setTrainNumber(e.target.value)} placeholder="For example, 12614" maxLength={30} className="w-full h-[52px] rounded-xl border border-[#D9E1EA] px-3.5 text-sm"/></div>
        <div className="space-y-1.5"><label htmlFor="travel-date" className="block text-xs font-bold uppercase tracking-wider">Arrival / travel date</label><input id="travel-date" type="date" min={today()} required value={travelDate} onChange={e=>setTravelDate(e.target.value)} className="w-full h-[52px] rounded-xl border border-[#D9E1EA] px-3.5 text-sm"/></div>
        <div className="space-y-1.5"><label htmlFor="destination-stop" className="block text-xs font-bold uppercase tracking-wider">Destination point</label><select id="destination-stop" required value={destination} onChange={e=>setDestination(e.target.value)} disabled={!destinations.length} className="w-full h-[52px] rounded-xl bg-white border border-[#D9E1EA] px-3.5 text-sm"><option value="">{destinations.length ? 'Choose a destination stop' : 'Loading route stops…'}</option>{destinations.map(name=><option key={name} value={name}>{name}</option>)}</select><p className="text-[11px] text-[#74777d]">{destinations.length.toLocaleString()} unique stops from the bus route dataset.</p></div>
        <button type="submit" disabled={busy||!destinations.length} className="w-full h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-[#F5A524] text-[#0B1F33] disabled:opacity-50">{busy?<><Loader2 className="w-4 h-4 animate-spin"/>Searching buses…</>:<><Search className="w-4 h-4"/>Search buses</>}</button>
        {(error || dataError) && <div role="alert" className="p-3 rounded-xl bg-[#FDE8E8] text-xs font-semibold text-[#D32F2F] flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error || dataError}</div>}
      </form>
      {searched && <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg text-[#0B1F33]">Available route services</h2><span className="text-[10px] text-[#74777d]">Live seats · updates every 5 sec</span></div>
        {!results.length ? <div className="bg-white rounded-2xl p-5 border border-[#D9E1EA] text-sm text-[#74777d]">No available route found for this destination and date.</div> : results.map(option=>{
          const full=option.seatsRemaining===0 || !['AVAILABLE','AGGREGATING','READY_TO_DISPATCH'].includes(option.status);
          return <article key={option.route.id} className="bg-white rounded-2xl p-4 border border-[#D9E1EA] shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3"><div><span className="font-mono text-xs font-bold text-[#F5A524] bg-[#0B1F33] px-2 py-0.5 rounded">{option.route.routeCode}</span><h3 className="font-bold text-base text-[#0B1F33] mt-1.5">{option.destinationStop.stopName}</h3><p className="text-xs text-[#74777d]">Train {option.trainNumber} · {option.travelDate}</p></div><div className="text-right"><span className="font-mono text-lg font-bold text-[#0B1F33]">₹{option.farePerSeat}</span><span className="block text-[10px] text-[#74777d]">per seat</span></div></div>
            <p className="flex items-start gap-1 text-[11px] text-[#0B7A55]"><Clock3 className="w-3.5 h-3.5 shrink-0"/>Bus departs {option.departureNote.toLowerCase()}.</p>
            <div className="rounded-xl bg-[#F3F6FA] p-3"><div className="flex justify-between text-xs"><b className="flex items-center gap-1"><Bus className="w-3.5 h-3.5"/> {option.confirmedSeats} paid{option.checkoutHolds ? ` · ${option.checkoutHolds} held` : ''} / {option.capacity}</b><span>{option.seatsRemaining} left</span></div><div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden"><div className="h-full bg-[#0B7A55] rounded-full" style={{width:`${Math.min(100,(option.confirmedSeats+option.checkoutHolds)/option.capacity*100)}%`}}/></div></div>
            <button type="button" disabled={busy||Boolean(selecting)||full} onClick={()=>void selectService(option)} className="w-full h-10 rounded-xl bg-[#0B1F33] text-[#F5A524] font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40">{selecting===option.route.id?<><Loader2 className="w-4 h-4 animate-spin"/>Opening service…</>:full?'No seats available':option.status==='READY_TO_DISPATCH'?'Join waiting list · dispatch ready':'Select bus & seats'}<ArrowRight className="w-3.5 h-3.5"/></button>
          </article>
        })}
        <div className="bg-[#ecf4fe] rounded-xl p-3.5 flex items-start gap-2.5 border border-[#c4c6cd]/40"><Info className="w-4 h-4 shrink-0 mt-0.5"/><p className="text-xs leading-relaxed">The bus holds up to 56 passengers. At 20 paid seats, Admin can approve dispatch; seats remain available until the bus is full. Your QR ticket is generated after dispatch approval. Departure is coordinated with your train arrival.</p></div>
      </section>}
      <div className="text-center pt-1"><button type="button" onClick={()=>navigate('/tickets')} className="text-xs font-semibold text-[#0B1F33] hover:underline">{t.registration.alreadyBooked}</button></div>
    </div>
  );
};
