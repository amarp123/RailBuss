import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Bus, ArrowRight } from 'lucide-react';
import { BusRoute } from '../types';

export const SchedulesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, routes, updateBookingFlow } = useApp();
  const handleBookRoute = (route: BusRoute) => {
    updateBookingFlow({ destinationStopId: route.stops[route.stops.length - 1]?.id ?? route.id });
    navigate('/');
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-4 pb-28 pt-20 px-4">
      {/* Title */}
      <h1 className="font-bold text-2xl text-[#0B1F33] tracking-tight">
        {t.nav.schedules}
      </h1>

      <div className="flex items-center gap-2 text-xs font-bold text-[#0B1F33]"><Bus className="w-4 h-4"/>Feeder route paths from the project route dataset</div>
      <div className="space-y-3">
          {routes.map((route) => {
            const destName = language === 'kn' ? route.destinationNameKn : route.destinationName;
            const viaText = language === 'kn' ? route.viaKn : route.via;

            return (
              <div
                key={route.id}
                className="bg-white rounded-2xl p-4 border border-[#D9E1EA] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#F5A524] bg-[#0B1F33] px-2 py-0.5 rounded">
                      {route.routeCode}
                    </span>
                    <h3 className="font-bold text-base text-[#0B1F33] mt-1.5">
                      {destName}
                    </h3>
                    <p className="text-xs text-[#74777d]">{viaText}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-bold text-[#0B1F33]">₹{route.fixedFare}</span>
                    <span className="block text-[10px] text-[#74777d]">Fixed Fare</span>
                  </div>
                </div>

                {/* Stops Timeline Accordion / Summary */}
                <div className="p-3 bg-[#F3F6FA] rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#74777d] text-[11px] font-semibold">
                    <span>{route.stopsCount} stops</span>
                    <span>{route.totalDistanceKm > 0 ? `${route.totalDistanceKm} km` : 'Distance unavailable'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-[#44474c] no-scrollbar">
                    {route.stops.map((s, idx) => (
                      <React.Fragment key={s.id}>
                        <span className="shrink-0 bg-white px-2 py-0.5 rounded border border-[#D9E1EA]">
                          {s.stopName}
                        </span>
                        {idx < route.stops.length - 1 && <span className="text-[#c4c6cd]">&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookRoute(route)}
                  className="w-full h-10 rounded-xl bg-[#0B1F33] text-[#F5A524] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <span>Register train for this route</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};
