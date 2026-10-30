# RailBus demand based transit MVP

This workspace contains a passenger app, Admin dashboard and separate Conductor mobile app, FastAPI backend, and SQLite database. Route options and stop names are imported from the supplied `bus_routes.csv`; the backend no longer calls the old ngrok API.

## Run locally

From PowerShell in this folder:

```powershell
python -m pip install -r requirements.txt
npm install
npm --prefix "frontend app/Rail_bus-main" ci
Copy-Item backend/.env.example backend/.env
npm run dev:all
```

Keep the terminal open. Admin: <http://localhost:5173>. Conductor mobile app: <http://localhost:5173/conductor-app/>. Passenger app: <http://localhost:5173/passenger-app/>. API docs: <http://127.0.0.1:8008/docs>.

If you already have a server running on ports 5173–5175 or 8008, stop its terminal with **Ctrl+C** before starting `dev:all`. The command waits for the backend health check before starting the three frontend servers.

If you see `ECONNREFUSED 127.0.0.1:8008`, the backend is stopped or still starting. Keep `npm run dev:all` running until it prints **RailBus API is ready**. If using `npm run dev` for Vite separately, open another PowerShell window in this folder and run `npm run backend`.

## MVP payment behavior

The app currently uses a direct-pay MVP action: tapping **Pay** marks the reservation as paid in the local backend. No payment gateway or credentials are required. This records payment state only; it does not charge a card or transfer money. If demand expires below 20 seats, the reservation is cancelled and no automatic refund is possible.

## User journey

1. Passenger signs in, enters the train number and travel date, selects a destination, and taps **Search buses**. Boarding is fixed to Mysuru Junction.
2. The API lists route services from `bus_routes.csv`, their common fare, 56-seat capacity, current paid demand, and seats remaining. The specific demand bus leaves after train arrival and Admin dispatch approval. The app refreshes demand every five seconds.
3. Passenger selects a route, chooses seats, and taps **Pay**. The backend records the reservation as paid immediately and validates capacity transactionally.
4. A paid reservation waits for dispatch. It does not create a ticket. Paid seats count toward that train, route, destination, and date group.
5. At 20 paid seats, Admin sees a dispatch alert with passenger contact details, train, route, fare, and capacity. Bookings can continue up to 56 seats. Admin selects **Dispatch bus & issue tickets** to confirm the service.
6. Admin approval issues signed QR tickets and sends in-app confirmation notifications. The Conductor can then open boarding, see the passenger manifest, validate each ticket once, depart, and complete the service.
7. If a group does not receive Admin dispatch approval before its demand deadline (12 hours by default), the backend cancels it and sends in-app cancellation notifications. The MVP does not charge or refund real money.
8. Passengers can check the paid waitlist state, confirmed ticket, or cancellation in booking history and notifications. Notifications and booking state sync while the app is open.

No manual trip creation, bus inventory, or bus assignment is used. Train numbers and dates are supplied by each passenger. The threshold and available seats are enforced transactionally by the backend.

## Operations accounts

- Admin: `admin@railbus.com` / `password123`
- Operator: `operator@railbus.com` / `password123`
- Conductors: created individually by an Admin from the dashboard.

Passengers create their own account. Set `RAILBUS_DEMO_PASSWORD` in `backend/.env` before the first start to change seeded operations passwords.

## Data and configuration

- Common fare: `RAILBUS_FARE_INR` (default ₹50 per seat).
- Demand window: `RAILBUS_DEMAND_WINDOW_HOURS` (default 12 hours).
- SQLite file: `backend/railbus.sqlite3`.
- Route data source: `bus_routes.csv`.
- The first workflow-version migration removes reservations, tickets, and demand groups from the previous instant-ticket demo, while preserving accounts and route records. Later restarts keep current records.

The CSV has ordered stop names but no trusted coordinates. Admin's route overview geocodes these names with OpenStreetMap and draws a road route estimate via OSRM; these estimates need internet and are not live traffic. This MVP does not connect to a live train-arrival feed, SMS/WhatsApp service, or a KSRTC fleet dispatch API. Admin dispatch approval means the operations team has approved the demand group; a real bus must still be sent by the operator.

## Verify

```powershell
python -m unittest backend.test_workflow -v
npm run build
```

The tests cover direct-pay reservation, the 20-seat lock, Admin dispatch, delayed ticket generation, conductor boarding, and cancellation.

## Conductor mobile app

Run all local services with `npm run dev:all`. The Admin dashboard is at `http://localhost:5173`, Passenger app at `http://localhost:5173/passenger-app/`, and Conductor mobile app at `http://localhost:5173/conductor-app/` (direct Vite app: `http://localhost:5175/conductor-app/`). Camera scanning requires HTTPS or localhost and camera permission.

Create conductor credentials from Admin → Conductors. Conductors sign in only at the Conductor app; the Admin dashboard accepts Admin and Operator accounts. On a dispatched service, the conductor opens boarding and scans a passenger QR. The backend validates the signed QR, rejects invalid, wrong-route, cancelled, and already-boarded tickets, marks a valid ticket as boarded, and returns passenger details for immediate display.

`npm run build` builds the Admin dashboard, Passenger app, and Conductor app into `dist/`.
