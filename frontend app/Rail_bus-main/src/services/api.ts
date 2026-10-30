import type { Booking, BusRoute, PassengerProfile, RouteStop, TicketPayload, Trip, TripStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/railbus-api/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'railbus-token';

type Data = Record<string, any>;
export type ServiceOption = { route: BusRoute; tripId: string | null; destinationStop: RouteStop; trainNumber: string; travelDate: string; status: string; capacity: number; confirmedSeats: number; checkoutHolds: number; seatsRemaining: number; farePerSeat: number; deadlineAt: string | null };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('ngrok-skip-browser-warning', 'true');
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (authenticated && token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the RailBus backend at ${API_BASE}. Start it with npm run dev:all from the AdminDashboard folder, then retry.`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('railbus_user');
      window.dispatchEvent(new Event('railbus-auth-expired'));
    }
    const detail = payload?.detail;
    throw new ApiError(response.status, typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: Data) => e.msg || 'Invalid request').join('; ') : `Request failed (${response.status})`);
  }
  return payload as T;
}

const pick = (o: Data, ...keys: string[]) => keys.map((key) => o?.[key]).find((v) => v !== undefined && v !== null);
const asNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function normalizeStop(raw: Data, index: number): RouteStop {
  return {
    id: String(pick(raw, 'id', 'stop_id') ?? `stop-${index + 1}`),
    sequenceOrder: asNumber(pick(raw, 'sequence_order', 'stop_order', 'sequence', 'order'), index + 1),
    stopName: String(pick(raw, 'stop_name', 'name', 'stopName') ?? 'Stop'),
    stopNameKn: pick(raw, 'stop_name_kn', 'name_kn'),
    latitude: asNumber(pick(raw, 'latitude', 'lat'), 0),
    longitude: asNumber(pick(raw, 'longitude', 'lon', 'lng'), 0),
    estimatedMinutesFromOrigin: asNumber(pick(raw, 'estimated_minutes_from_origin', 'minutes_from_origin'), asNumber(pick(raw, 'distance_from_origin_km', 'distance_km')) * 2),
  };
}

function normalizeRoute(raw: Data): BusRoute {
  const stops = (Array.isArray(raw.stops) ? raw.stops : Array.isArray(raw.route_stops) ? raw.route_stops : []).map(normalizeStop);
  const destination = String(pick(raw, 'destination', 'destination_name', 'name') ?? 'Route');
  return {
    id: String(raw.id),
    routeCode: String(pick(raw, 'route_code', 'code') ?? raw.id),
    destinationName: destination,
    destinationNameKn: String(pick(raw, 'destination_name_kn') ?? destination),
    via: pick(raw, 'via', 'via_text'),
    viaKn: pick(raw, 'via_kn'),
    fixedFare: asNumber(pick(raw, 'fixed_fare', 'base_fare', 'fare'), 0),
    totalDistanceKm: asNumber(pick(raw, 'total_distance_km', 'distance_km', 'total_distance'), 0),
    stopsCount: asNumber(pick(raw, 'stops_count', 'stop_count'), stops.length),
    stops: stops.sort((a, b) => a.sequenceOrder - b.sequenceOrder),
  };
}

function normalizeTrip(raw: Data, routes: BusRoute[]): Trip {
  const routeId = String(pick(raw, 'route_id') ?? raw.route?.id ?? '');
  const baseRoute = routes.find((item) => item.id === routeId) ?? (raw.route ? normalizeRoute(raw.route) : undefined);
  const destinationStopId = String(raw.destination_stop_id ?? '');
  const destinationStopIndex = baseRoute?.stops.findIndex((stop) => stop.id === destinationStopId) ?? -1;
  const destinationName = String(raw.destination ?? baseRoute?.destinationName ?? raw.route_name ?? 'Destination');
  const route = baseRoute ? { ...baseRoute, destinationName, destinationNameKn: destinationName,
    stops: destinationStopIndex >= 0 ? baseRoute.stops.slice(0, destinationStopIndex + 1) : baseRoute.stops } : undefined;
  const departure = String(pick(raw, 'departure_time', 'scheduled_departure_time') ?? raw.travel_date ?? '');
  const statusMap: Record<string, TripStatus> = { AGGREGATING: 'OPEN', READY_TO_DISPATCH: 'READY_TO_DISPATCH', SCHEDULED: 'DISPATCHED', DISPATCHED: 'DISPATCHED', BOARDING: 'DISPATCHED' };
  const status = String(raw.status ?? 'OPEN').toUpperCase();
  const count = asNumber(pick(raw, 'demand_count', 'confirmed_bookings_count', 'confirmedBookingsCount'));
  return {
    id: String(raw.id), routeId, route: route ?? normalizeRoute({ id: routeId, name: raw.route_name, origin: raw.origin, destination: raw.destination }),
    scheduledDepartureTime: departure, departureTimeDisplay: departure.includes('T') ? new Date(departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    status: statusMap[status] ?? status as TripStatus,
    confirmedBookingsCount: count, targetThreshold: asNumber(pick(raw, 'target_threshold'), 20),
    busNumber: pick(raw, 'bus_registration', 'bus_number'), conductorName: pick(raw, 'conductor_name'), boardingBay: pick(raw, 'boarding_bay'),
    connectedTrainNumber: pick(raw, 'train_number'),
  };
}

function normalizeProfile(raw: Data): PassengerProfile {
  return { id: String(pick(raw, 'id', 'user_id')), fullName: String(pick(raw, 'full_name', 'fullName') ?? ''), phone: String(raw.phone ?? ''), email: raw.email, preferredLanguage: 'en', createdAt: String(pick(raw, 'created_at', 'createdAt') ?? new Date().toISOString()) };
}

function normalizeBooking(raw: Data, trips: Trip[] = []): Booking {
  const tripId = String(pick(raw, 'trip_id', 'tripId') ?? raw.trip?.id ?? '');
  const trip = trips.find((item) => item.id === tripId) ?? (raw.trip ? normalizeTrip(raw.trip, []) : undefined);
  const fare = asNumber(pick(raw, 'fare_amount', 'total_fare_paid', 'totalFarePaid'));
  const ticketRaw = raw.ticket ?? raw;
  const qr = pick(ticketRaw, 'qr_content', 'qr_code', 'qr_signature', 'qrSignature');
  const ticketId = pick(ticketRaw, 'ticket_id') ?? pick(raw, 'ticket_id') ?? (ticketRaw.ticket_reference ? ticketRaw.id : undefined);
  const ticket: TicketPayload | undefined = ticketId && qr ? {
    ticketId: String(ticketId), bookingId: String(raw.id), tripId,
    ticketCode: String(pick(ticketRaw, 'ticket_reference', 'ticket_code', 'ticketCode') ?? raw.booking_reference ?? ticketId),
    qrSignature: String(qr), qrDataUrl: pick(ticketRaw, 'qr_data_url', 'qrDataUrl') ?? pick(raw, 'qr_data_url', 'qrDataUrl'), issuedAt: String(pick(ticketRaw, 'issued_at', 'issuedAt') ?? new Date().toISOString()),
    validUntil: String(pick(ticketRaw, 'expires_at', 'valid_until') ?? ''),
  } : undefined;
  const routeStops = trip?.route.stops ?? [];
  const selectedStop = raw.destination_stop ? normalizeStop(raw.destination_stop, 0) : routeStops.find((stop) => stop.id === String(raw.destination_stop_id ?? ''));
  const endStop = selectedStop ?? routeStops[routeStops.length - 1] ?? normalizeStop({ id: `route-${tripId}-destination`, stop_name: trip?.route.destinationName ?? raw.route_name ?? 'Destination' }, 0);
  const rawStatus = String(raw.status ?? 'PENDING_PAYMENT').toUpperCase();
  return {
    id: String(pick(raw, 'booking_id', 'id')), passengerId: String(pick(raw, 'passenger_id', 'passengerId') ?? ''),
    passengerName: String(pick(raw, 'passenger_name', 'passengerName') ?? ''), passengerPhone: String(pick(raw, 'passenger_phone', 'passengerPhone') ?? ''),
    tripId, trip: trip ?? normalizeTrip({ id: tripId, status: 'OPEN' }, []), destinationStop: endStop,
    seatCount: asNumber(pick(raw, 'seat_count', 'seatCount'), 1), totalFarePaid: fare,
    status: (ticketRaw.status === 'BOARDED' ? 'BOARDED' : rawStatus === 'SUCCESS' || rawStatus === 'ISSUED' ? 'CONFIRMED' : rawStatus) as Booking['status'],
    ticket, createdAt: String(pick(raw, 'created_at', 'createdAt') ?? new Date().toISOString()),
    paymentReference: pick(raw, 'payment_reference', 'transaction_reference'),
    paymentStatus: pick(raw, 'payment_status'),
  };
}

async function allRoutes(): Promise<BusRoute[]> {
  const all: BusRoute[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await request<Data[]>(`/routes?limit=200&offset=${offset}`);
    all.push(...page.map(normalizeRoute));
    if (page.length < 200) return all;
  }
}

export async function getOfflineTickets(): Promise<Booking[]> {
  try {
    const key = offlineTicketsKey();
    const db = await openOfflineDb();
    return await new Promise<Booking[]>((resolve, reject) => {
      const request = db.transaction('cache', 'readonly').objectStore('cache').get(key);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  } catch { return []; }
}
async function cacheTicketOffline(booking: Booking) {
  const cached = await getOfflineTickets();
  const key = offlineTicketsKey();
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('cache', 'readwrite').objectStore('cache').put([booking, ...cached.filter((item) => item.id !== booking.id)], key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
function offlineTicketsKey() {
  try {
    const user = JSON.parse(localStorage.getItem('railbus_user') || 'null');
    return `tickets:${user?.id ?? 'guest'}`;
  } catch { return 'tickets:guest'; }
}
function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('railbus-passenger-cache', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains('cache')) db.deleteObjectStore('cache');
      db.createObjectStore('cache');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function clearOfflineTickets() {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('cache', 'readwrite').objectStore('cache').delete(offlineTicketsKey());
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const api = {
  async login(email: string, password: string): Promise<PassengerProfile> {
    const result = await request<Data>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    if (!result.access_token) throw new ApiError(502, 'The backend did not return an access token.');
    if (String(result.role).toUpperCase() !== 'PASSENGER') throw new ApiError(403, `This app is for passenger accounts. Your account role is ${result.role}.`);
    sessionStorage.setItem(TOKEN_KEY, result.access_token);
    const profile = normalizeProfile(result);
    localStorage.setItem('railbus_user', JSON.stringify(profile));
    return profile;
  },
  async register(fullName: string, email: string, phone: string, password: string): Promise<PassengerProfile> {
    const result = await request<Data>('/auth/register', { method: 'POST', body: JSON.stringify({ full_name: fullName, email, phone, password }) }, false);
    if (!result.access_token) throw new ApiError(502, 'The backend did not return an access token.');
    const profile = normalizeProfile(result);
    sessionStorage.setItem(TOKEN_KEY, result.access_token);
    localStorage.setItem('railbus_user', JSON.stringify(profile));
    return profile;
  },
  async getMe(): Promise<PassengerProfile | null> {
    if (!sessionStorage.getItem(TOKEN_KEY)) return null;
    const profile = normalizeProfile(await request<Data>('/auth/me'));
    localStorage.setItem('railbus_user', JSON.stringify(profile));
    return profile;
  },
  async getRoutes() { return allRoutes(); },
  async getRouteById(id: string) { return normalizeRoute(await request<Data>(`/routes/${encodeURIComponent(id)}`)); },
  async searchServices(destination: string, trainNumber: string, travelDate: string): Promise<ServiceOption[]> {
    const rows = await request<Data[]>('/services/search', { method: 'POST', body: JSON.stringify({ destination, train_number: trainNumber, travel_date: travelDate }) });
    return rows.map((row) => ({ route: normalizeRoute(row.route), tripId: row.trip_id ? String(row.trip_id) : null,
      destinationStop: normalizeStop(row.destination_stop, 0), trainNumber: String(row.train_number), travelDate: String(row.travel_date),
      status: String(row.status), capacity: asNumber(row.capacity, 20), confirmedSeats: asNumber(row.confirmed_seats),
      checkoutHolds: asNumber(row.active_checkout_holds), seatsRemaining: asNumber(row.seats_remaining), farePerSeat: asNumber(row.fare_per_seat), deadlineAt: row.deadline_at ?? null }));
  },
  async resolveTrip(routeId: string, destinationStopId: string, trainNumber: string, travelDate: string): Promise<Trip> {
    const [raw, route] = await Promise.all([
      request<Data>('/trips/resolve', { method: 'POST', body: JSON.stringify({ route_id: routeId, destination_stop_id: destinationStopId, train_number: trainNumber, travel_date: travelDate }) }),
      api.getRouteById(routeId),
    ]);
    return normalizeTrip(raw, [route]);
  },
  async getTrips(routeId?: string): Promise<Trip[]> {
    const routes = await allRoutes();
    const query = routeId ? `?route_id=${encodeURIComponent(routeId)}` : '';
    const trips = await request<Data[]>(`/trips${query}`);
    return trips.map((raw) => normalizeTrip(raw, routes));
  },
  async getTripDemand(tripId: string): Promise<{ confirmedCount: number; threshold: number; status: TripStatus }> {
    const raw = await request<Data>(`/trips/${encodeURIComponent(tripId)}`);
    return { confirmedCount: asNumber(pick(raw, 'demand_count', 'confirmed_bookings_count')), threshold: asNumber(raw.target_threshold, 20), status: String(raw.status ?? 'OPEN') as TripStatus };
  },
  async payForReservation(tripId: string, destinationStopId: string, seatCount: number): Promise<Booking> {
    const raw = await request<Data>('/payments/pay', {
      method: 'POST', body: JSON.stringify({ trip_id: tripId, destination_stop_id: destinationStopId, seat_count: seatCount }),
    });
    const booking = normalizeBooking(raw);
    if (booking.ticket) await cacheTicketOffline(booking);
    return booking;
  },
  async getNotifications() { return request<Data[]>('/notifications'); },
  async markNotificationRead(id: string) { return request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }); },
  async getBookings(trips: Trip[]): Promise<Booking[]> {
    const items = await request<Data[]>('/bookings');
    return items.map((raw) => normalizeBooking(raw, trips));
  },
  async getBookingById(id: string, trips: Trip[]): Promise<Booking | undefined> {
    const raw = await request<Data>(`/tickets/${encodeURIComponent(id)}`);
    return normalizeBooking(raw, trips);
  },
};
