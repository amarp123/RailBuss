import tempfile
import unittest
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import HTTPException

import backend.main as service


class DemandDispatchWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.previous_db = service.DB_PATH
        service.DB_PATH = Path(tempfile.gettempdir()) / f"railbus-test-{uuid.uuid4().hex}.sqlite3"
        service.init_db()
        self.routes = service.list_routes(limit=500, offset=0)
        self.route = self.routes[0]
        self.stop = self.route["stops"][0]
        registered = service.register(service.RegisterBody(full_name="MVP Passenger", email=f"{uuid.uuid4().hex}@example.test", phone="9999999999", password="password123"))
        self.passenger = self.user_from_token(registered["access_token"])
        self.admin = self.user_from_token(service.login(service.LoginBody(email="admin@railbus.com", password="password123"))["access_token"])

    def tearDown(self):
        path = service.DB_PATH
        service.DB_PATH = self.previous_db
        for suffix in ("", "-wal", "-shm"):
            candidate = Path(str(path) + suffix)
            if candidate.exists(): candidate.unlink()

    @staticmethod
    def user_from_token(token):
        with service.db() as con:
            return con.execute("SELECT * FROM users WHERE id=?", (service.decode_token(token),)).fetchone()

    def resolve(self, train="12614"):
        body = service.ResolveTripBody(route_id=self.route["id"], destination_stop_id=self.stop["id"], train_number=train, travel_date="2099-01-01")
        return service.resolve_trip(body, self.passenger)

    def pay(self, trip_id, seats):
        return service.pay_for_reservation(service.DirectPaymentBody(trip_id=trip_id, destination_stop_id=self.stop["id"], seat_count=seats), self.passenger)

    def test_direct_payment_waitlist_threshold_and_dispatch(self):
        trip = self.resolve()
        bookings = [self.pay(trip["id"], seats) for seats in (6, 6, 6, 1)]
        self.assertTrue(all(row["status"] == "WAITING_DISPATCH" and "ticket" not in row for row in bookings))
        with self.assertRaises(HTTPException): service.dispatch_service(trip["id"], None, self.admin)
        final = self.pay(trip["id"], 1)
        self.assertEqual(final["trip"]["status"], "READY_TO_DISPATCH")
        self.assertNotIn("ticket", final)
        self.assertTrue(any(n["kind"] == "DISPATCH_REQUIRED" for n in service.passenger_notifications(self.admin)))
        self.assertEqual(service.dispatch_service(trip["id"], None, self.admin)["status"], "DISPATCHED")
        self.assertTrue(all(row["ticket"]["qr_content"] for row in service.passenger_bookings(self.passenger)))

    def test_capacity_prevents_overselling(self):
        trip = self.resolve()
        self.pay(trip["id"], 6); self.pay(trip["id"], 6); self.pay(trip["id"], 6); self.pay(trip["id"], 1); self.pay(trip["id"], 1)
        with self.assertRaises(HTTPException) as error: self.pay(trip["id"], 1)
        self.assertEqual(error.exception.status_code, 409)

    def test_expiry_cancels_direct_paid_reservation_without_gateway_refund(self):
        trip = self.resolve()
        booking = self.pay(trip["id"], 1)
        with service.db() as con:
            con.execute("UPDATE trips SET deadline_at=? WHERE id=?", ((datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat(), trip["id"]))
        service.expire_demand_groups()
        with service.db() as con:
            row = con.execute("SELECT status FROM bookings WHERE id=?", (booking["id"],)).fetchone()
        self.assertEqual(row["status"], "CANCELLED")
        self.assertTrue(any(n["kind"] == "SERVICE_CANCELLED" for n in service.passenger_notifications(self.passenger)))

    def test_destination_is_validated(self):
        bad = service.ResolveTripBody(route_id=self.route["id"], destination_stop_id="bad", train_number="12614", travel_date="2099-01-01")
        with self.assertRaises(HTTPException): service.resolve_trip(bad, self.passenger)


if __name__ == "__main__": unittest.main()
