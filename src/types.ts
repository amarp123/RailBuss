export type UserRole = 'ADMIN' | 'CONDUCTOR' | 'OPERATOR' | 'PASSENGER';
export type TripStatus = 'AGGREGATING' | 'READY_TO_DISPATCH' | 'DISPATCHED' | 'THRESHOLD_MET' | 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'COMPLETED' | 'CANCELLED';
export type TicketStatus = 'ISSUED' | 'BOARDED' | 'EXPIRED' | 'CANCELLED';

export interface AuthUser { access_token: string; token_type: string; role: UserRole; user_id: string; email: string; full_name: string }
export interface UserProfile { id: string; email: string; full_name: string; phone?: string | null; role: UserRole; is_active: boolean; created_at: string }
export interface RouteStop { id: string; stop_name: string; stop_order?: number; sequence_order?: number; distance_from_origin_km: number; latitude?: number | string | null; longitude?: number | string | null; lat?: number | string; lon?: number | string }
export interface BusRoute { id: string; name: string; route_code: string; origin: string; destination: string; distance_km: number; fixed_fare: number; stops: RouteStop[] }
export interface Trip { id: string; route_id: string; route_name?: string | null; origin?: string | null; destination?: string | null; status: TripStatus; demand_count: number; capacity: number; boarded_count: number; base_fare: number; departure_time?: string | null; travel_date?: string; train_number?: string; destination_stop_id?: string; deadline_at?: string | null; bus_id?: string | null; bus_registration?: string | null; conductor_name?: string | null; threshold_met?: boolean }
export interface ConductorAccount { id:string; email:string; full_name:string; phone?:string|null; role:'CONDUCTOR'; is_active:boolean; created_at:string }
export interface OperationalEvent { id: string; event_type: string; trip_id?: string | null; route_name?: string | null; message: string; created_at: string }
export interface OperatorNotification { id: string; trip_id?: string | null; kind: string; title: string; message: string; created_at: string; read_at?: string | null }
export interface OperatorBooking { id:string; booking_reference:string; passenger_id:string; passenger_name:string; passenger_phone:string; passenger_email:string; trip_id:string; route_id:string; route_name:string; destination_stop?:{stop_name:string}; seat_count:number; fare_amount:number; status:string; payment_status:string; created_at:string }
export interface ApiProblem { detail?: string | { msg?: string }[] }
