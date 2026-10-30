export type TripStatus =
  | 'OPEN'        // 0-19 bookings; collecting demand
  | 'ELIGIBLE'    // >= 20 bookings; locked and waiting for operator approval
  | 'APPROVED'    // Operator approved trip
  | 'REJECTED'    // Operator rejected trip; automatic refunds
  | 'READY_TO_DISPATCH'
  | 'DISPATCHED'  // Admin approved; tickets issued
  | 'ASSIGNED'    // Legacy map alias
  | 'DEPARTED'    // Bus departed
  | 'COMPLETED'   // Journey finished
  | 'CANCELLED';  // Demand window closed below threshold

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'WAITING_DISPATCH'
  | 'CONFIRMED'
  | 'BOARDED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Train {
  id: string;
  trainNumber: string;
  trainName: string;
  originStation: string;
  destinationStation: string;
  scheduledArrival: string; // e.g. "11:00"
}

export interface RouteStop {
  id: string;
  sequenceOrder: number;
  stopName: string;
  stopNameKn?: string;
  latitude: number;
  longitude: number;
  estimatedMinutesFromOrigin: number;
}

export interface BusRoute {
  id: string;
  routeCode: string; // e.g. "RB-103"
  destinationName: string;
  destinationNameKn: string;
  via?: string;
  viaKn?: string;
  fixedFare: number;
  totalDistanceKm: number;
  stopsCount: number;
  stops: RouteStop[];
}

export interface Trip {
  id: string;
  routeId: string;
  route: BusRoute;
  scheduledDepartureTime: string; // HH:MM or ISO
  departureTimeDisplay: string;
  status: TripStatus;
  confirmedBookingsCount: number;
  targetThreshold: number; // 20
  capacity: number; // 56 seats per bus
  busNumber?: string;
  conductorName?: string;
  boardingBay?: string;
  connectedTrainNumber?: string;
}

export interface TicketPayload {
  ticketId: string;
  bookingId: string;
  tripId: string;
  ticketCode: string; // e.g. "RB-7K2Q9"
  qrSignature: string; // HMAC-signed string
  qrDataUrl?: string;
  issuedAt: string;
  validUntil: string;
}

export interface Booking {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  tripId: string;
  trip: Trip;
  destinationStop: RouteStop;
  seatCount: number;
  totalFarePaid: number;
  status: BookingStatus;
  ticket?: TicketPayload;
  createdAt: string;
  paymentReference?: string;
  paymentStatus?: string;
  refundStatus?: 'NONE' | 'PENDING' | 'PROCESSED';
}

export interface PassengerProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  preferredLanguage: 'en' | 'kn';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleKn: string;
  message: string;
  messageKn: string;
  type: 'TRIP_APPROVED' | 'THRESHOLD_REACHED' | 'BUS_ASSIGNED' | 'REFUND_ISSUED' | 'INFO' | 'WAITING_DISPATCH' | 'TICKET_CONFIRMED' | 'SERVICE_CANCELLED' | 'DISPATCH_REQUIRED';
  timestamp: string;
  read: boolean;
  tripId?: string;
}
