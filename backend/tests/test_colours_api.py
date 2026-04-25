"""End-to-end backend tests for Colours salon app."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://appointme-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@salon.com"
ADMIN_PASSWORD = "admin123"

ALLOWED_CATEGORIES = {"Hair", "Skin", "Makeup", "Academy"}
DISALLOWED_CATEGORIES = {"Spa", "Nails", "Facial"}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def user_creds():
    suffix = uuid.uuid4().hex[:8]
    return {
        "name": "TEST_User",
        "email": f"TEST_user_{suffix}@example.com",
        "password": "testpass123",
        "phone": "9999999999",
    }


@pytest.fixture(scope="session")
def user_token(s, user_creds):
    r = s.post(f"{API}/auth/register", json=user_creds)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["role"] == "user"
    return data["token"]


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_login_admin(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert body["token"]

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, s, admin_headers):
        r = s.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_duplicate(self, s, user_creds, user_token):
        r = s.post(f"{API}/auth/register", json=user_creds)
        assert r.status_code == 400


# ---------- Public listings ----------
class TestPublic:
    def test_services_seeded(self, s):
        r = s.get(f"{API}/services")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6, f"Expected >=6 seeded services got {len(items)}"
        # No mongo _id leakage
        for it in items:
            assert "_id" not in it
            assert "id" in it and "name" in it and "price" in it and "category" in it

    def test_categories_only_allowed(self, s):
        r = s.get(f"{API}/services")
        cats = {it["category"] for it in r.json()}
        bad = cats & DISALLOWED_CATEGORIES
        assert not bad, f"Found disallowed categories: {bad}"
        assert cats <= ALLOWED_CATEGORIES, f"Unexpected categories: {cats - ALLOWED_CATEGORIES}"

    def test_professionals_seeded(self, s):
        r = s.get(f"{API}/professionals")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 4
        for it in items:
            assert "_id" not in it
            assert "rating" in it and "daily_target" in it

    def test_promos_active(self, s):
        r = s.get(f"{API}/promos")
        assert r.status_code == 200
        codes = {p["code"] for p in r.json()}
        assert {"WELCOME20", "GOLD15", "WEEKEND10"}.issubset(codes)


# ---------- Admin role enforcement ----------
class TestAdminEnforcement:
    def test_create_service_no_token(self, s):
        r = s.post(f"{API}/services", json={
            "name": "X", "category": "Hair", "price": 100, "duration_min": 30
        })
        assert r.status_code == 401

    def test_create_service_user_token(self, s, user_headers):
        r = s.post(f"{API}/services", json={
            "name": "X", "category": "Hair", "price": 100, "duration_min": 30
        }, headers=user_headers)
        assert r.status_code == 403

    def test_create_service_admin_ok(self, s, admin_headers):
        payload = {
            "name": "TEST_New Service",
            "category": "Skin",
            "price": 999.0,
            "duration_min": 45,
            "description": "test",
            "image_url": "https://x.com/i.jpg",
        }
        r = s.post(f"{API}/services", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        # verify in list
        lst = s.get(f"{API}/services").json()
        assert any(x["id"] == sid for x in lst)
        # cleanup
        s.delete(f"{API}/services/{sid}", headers=admin_headers)


# ---------- Promo validation ----------
class TestPromoValidate:
    def test_valid_code(self, s):
        r = s.post(f"{API}/promos/validate", json={"code": "WELCOME20"})
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == "WELCOME20"
        assert body["discount_percent"] == 20

    def test_lowercase_code(self, s):
        r = s.post(f"{API}/promos/validate", json={"code": "welcome20"})
        assert r.status_code == 200

    def test_invalid_code(self, s):
        r = s.post(f"{API}/promos/validate", json={"code": "NOPE_FAKE"})
        assert r.status_code == 404


# ---------- Booking flow ----------
class TestBooking:
    def test_full_booking_flow(self, s, user_headers, admin_headers):
        services = s.get(f"{API}/services").json()
        pros = s.get(f"{API}/professionals").json()
        svc = services[0]
        pro = pros[0]
        payload = {
            "service_id": svc["id"],
            "professional_id": pro["id"],
            "booking_datetime": "2026-02-15T10:30:00",
            "promo_code": "WELCOME20",
            "advance_amount": 200,
            "payment_method": "card",
        }
        r = s.post(f"{API}/bookings", json=payload, headers=user_headers)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["promo_code"] == "WELCOME20"
        expected_total = max(0, svc["price"] - svc["price"] * 0.20)
        assert abs(b["total"] - expected_total) < 0.01
        assert b["payment_status"] == "paid"
        assert b["status"] == "confirmed"

        # GET my bookings
        r2 = s.get(f"{API}/bookings", headers=user_headers)
        assert r2.status_code == 200
        assert any(x["id"] == b["id"] for x in r2.json())

        # Admin sees all
        r3 = s.get(f"{API}/admin/bookings", headers=admin_headers)
        assert r3.status_code == 200
        assert any(x["id"] == b["id"] for x in r3.json())

    def test_admin_bookings_user_forbidden(self, s, user_headers):
        r = s.get(f"{API}/admin/bookings", headers=user_headers)
        assert r.status_code == 403

    def test_booking_invalid_service(self, s, user_headers):
        r = s.post(f"{API}/bookings", json={
            "service_id": "fake", "professional_id": "fake",
            "booking_datetime": "2026-02-15T10:30:00",
        }, headers=user_headers)
        assert r.status_code == 404


# ---------- Mock Payment ----------
class TestPayment:
    def test_payment_success(self, s, user_headers):
        r = s.post(f"{API}/payments/process", json={"amount": 500, "method": "card"}, headers=user_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert body["transaction_id"].startswith("TXN")


# ---------- Revenue & dashboard ----------
class TestRevenue:
    def test_create_and_dashboard(self, s, admin_headers):
        pros = s.get(f"{API}/professionals").json()
        pro = pros[0]
        from datetime import date as _d
        today = _d.today().isoformat()
        r = s.post(f"{API}/admin/revenue", json={
            "professional_id": pro["id"], "date": today, "amount": 1234.0, "notes": "TEST_rev"
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]

        # Dashboard
        d = s.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert d.status_code == 200
        body = d.json()
        assert "today_revenue" in body
        assert body["today_revenue"] >= 1234.0
        assert "per_professional" in body and len(body["per_professional"]) >= 1
        # cleanup
        s.delete(f"{API}/admin/revenue/{rid}", headers=admin_headers)


# ---------- Professional rating ----------
class TestRating:
    def test_rate_pro(self, s, user_headers):
        pros = s.get(f"{API}/professionals").json()
        pid = pros[0]["id"]
        r = s.post(f"{API}/professionals/{pid}/rate", json={"rating": 5.0}, headers=user_headers)
        assert r.status_code == 200
        body = r.json()
        assert "rating" in body and "rating_count" in body


# ---------- Promo CRUD ----------
class TestPromoCRUD:
    def test_admin_create_list_delete(self, s, admin_headers):
        code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        r = s.post(f"{API}/promos", json={"code": code, "discount_percent": 5, "description": "TEST_promo"}, headers=admin_headers)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        lst = s.get(f"{API}/admin/promos", headers=admin_headers).json()
        assert any(p["id"] == pid for p in lst)

        d = s.delete(f"{API}/promos/{pid}", headers=admin_headers)
        assert d.status_code == 200

        lst2 = s.get(f"{API}/admin/promos", headers=admin_headers).json()
        assert not any(p["id"] == pid for p in lst2)
