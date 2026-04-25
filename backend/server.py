from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# -------- Config --------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@salon.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

app = FastAPI(title="Colours Salon API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

# -------- Helpers --------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(uid: str, email: str, role: str) -> str:
    payload = {
        "sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

# -------- Models --------
class RegisterIn(BaseModel):
    name: str
    phone: str
    password: str
    email: Optional[EmailStr] = None

class LoginIn(BaseModel):
    identifier: str  # phone or email
    password: str

class ServiceIn(BaseModel):
    name: str
    category: str  # Hair, Spa, Nails, Facial
    price: float
    duration_min: int
    description: Optional[str] = ""
    image_url: Optional[str] = ""

class ProfessionalIn(BaseModel):
    name: str
    specialty: str
    bio: Optional[str] = ""
    image_url: Optional[str] = ""
    rating: float = 4.5
    daily_target: float = 5000.0
    service_ids: List[str] = []

class PromoIn(BaseModel):
    code: str
    discount_percent: float
    description: Optional[str] = ""
    active: bool = True

class BookingIn(BaseModel):
    service_id: str
    professional_id: str
    booking_datetime: str  # ISO
    promo_code: Optional[str] = None
    advance_amount: float = 0
    payment_method: Optional[str] = "card"

class RevenueIn(BaseModel):
    professional_id: str
    date: str  # YYYY-MM-DD
    amount: float
    notes: Optional[str] = ""

class RateIn(BaseModel):
    rating: float

# -------- Auth Routes --------
def normalize_phone(p: str) -> str:
    return ''.join(c for c in (p or '') if c.isdigit() or c == '+')

def mock_notify(channel: str, to: str, message: str):
    """MOCKED: logs SMS/email to console; replace with Twilio/SendGrid later."""
    if not to:
        return None
    logging.info(f"[MOCK {channel.upper()}] to={to} msg={message}")
    return {"channel": channel, "to": to, "message": message, "status": "sent"}

@api.post("/auth/register")
async def register(data: RegisterIn):
    phone = normalize_phone(data.phone)
    if not phone or len(phone) < 7:
        raise HTTPException(400, "Valid phone number is required")
    email = data.email.lower() if data.email else None
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(400, "Phone already registered")
    if email and await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid, "name": data.name, "phone": phone, "email": email or "",
        "password_hash": hash_pw(data.password), "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_token(uid, email or phone, "user")
    mock_notify("sms", phone, f"Welcome to Colours, {data.name}! Your account is ready.")
    if email:
        mock_notify("email", email, f"Welcome to Colours — sign in anytime.")
    return {"token": token, "user": {"id": uid, "name": data.name, "phone": phone, "email": email or "", "role": "user"}}

@api.post("/auth/login")
async def login(data: LoginIn):
    ident = data.identifier.strip()
    user = None
    # try phone first
    phone = normalize_phone(ident)
    if phone:
        user = await db.users.find_one({"phone": phone})
    if not user and "@" in ident:
        user = await db.users.find_one({"email": ident.lower()})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user.get("email") or user.get("phone", ""), user["role"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "phone": user.get("phone", ""), "email": user.get("email", ""), "role": user["role"]}}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# -------- Services --------
@api.get("/services")
async def list_services():
    items = await db.services.find({}, {"_id": 0}).to_list(500)
    return items

@api.post("/services")
async def create_service(data: ServiceIn, _: dict = Depends(require_admin)):
    sid = str(uuid.uuid4())
    doc = {"id": sid, **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/services/{sid}")
async def delete_service(sid: str, _: dict = Depends(require_admin)):
    await db.services.delete_one({"id": sid})
    return {"ok": True}

# -------- Professionals --------
@api.get("/professionals")
async def list_pros():
    items = await db.professionals.find({}, {"_id": 0}).to_list(500)
    return items

@api.post("/professionals")
async def create_pro(data: ProfessionalIn, _: dict = Depends(require_admin)):
    pid = str(uuid.uuid4())
    doc = {"id": pid, **data.model_dump(), "rating_count": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.professionals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/professionals/{pid}")
async def update_pro(pid: str, data: ProfessionalIn, _: dict = Depends(require_admin)):
    res = await db.professionals.update_one({"id": pid}, {"$set": data.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Not found")
    item = await db.professionals.find_one({"id": pid}, {"_id": 0})
    return item

@api.delete("/professionals/{pid}")
async def delete_pro(pid: str, _: dict = Depends(require_admin)):
    await db.professionals.delete_one({"id": pid})
    return {"ok": True}

@api.post("/professionals/{pid}/rate")
async def rate_pro(pid: str, data: RateIn, user: dict = Depends(get_current_user)):
    pro = await db.professionals.find_one({"id": pid})
    if not pro:
        raise HTTPException(404, "Not found")
    count = pro.get("rating_count", 0)
    cur = pro.get("rating", 0)
    new_count = count + 1
    new_rating = (cur * count + data.rating) / new_count
    await db.professionals.update_one({"id": pid}, {"$set": {"rating": round(new_rating, 2), "rating_count": new_count}})
    return {"rating": round(new_rating, 2), "rating_count": new_count}

# -------- Promos --------
@api.get("/promos")
async def list_promos():
    items = await db.promos.find({"active": True}, {"_id": 0}).to_list(100)
    return items

@api.get("/admin/promos")
async def admin_list_promos(_: dict = Depends(require_admin)):
    items = await db.promos.find({}, {"_id": 0}).to_list(200)
    return items

@api.post("/promos")
async def create_promo(data: PromoIn, _: dict = Depends(require_admin)):
    code = data.code.upper()
    if await db.promos.find_one({"code": code}):
        raise HTTPException(400, "Code exists")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "code": code, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.promos.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/promos/{pid}")
async def delete_promo(pid: str, _: dict = Depends(require_admin)):
    await db.promos.delete_one({"id": pid})
    return {"ok": True}

@api.post("/promos/validate")
async def validate_promo(payload: dict):
    code = (payload.get("code") or "").upper()
    promo = await db.promos.find_one({"code": code, "active": True}, {"_id": 0})
    if not promo:
        raise HTTPException(404, "Invalid promo code")
    return promo

# -------- Bookings --------
@api.post("/bookings")
async def create_booking(data: BookingIn, user: dict = Depends(get_current_user)):
    service = await db.services.find_one({"id": data.service_id}, {"_id": 0})
    pro = await db.professionals.find_one({"id": data.professional_id}, {"_id": 0})
    if not service or not pro:
        raise HTTPException(404, "Service or professional not found")
    discount = 0
    promo_code = None
    if data.promo_code:
        promo = await db.promos.find_one({"code": data.promo_code.upper(), "active": True})
        if promo:
            discount = service["price"] * (promo["discount_percent"] / 100)
            promo_code = promo["code"]
    total = max(0, service["price"] - discount)
    bid = str(uuid.uuid4())
    doc = {
        "id": bid,
        "user_id": user["id"],
        "user_name": user["name"],
        "service_id": service["id"],
        "service_name": service["name"],
        "professional_id": pro["id"],
        "professional_name": pro["name"],
        "booking_datetime": data.booking_datetime,
        "price": service["price"],
        "discount": discount,
        "total": total,
        "promo_code": promo_code,
        "advance_paid": data.advance_amount,
        "payment_method": data.payment_method,
        "payment_status": "paid" if data.advance_amount > 0 else "pending",
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    # Mock SMS/Email confirmation
    notifications = []
    when_str = data.booking_datetime.replace("T", " ")[:16]
    msg = f"Colours: Booking confirmed — {service['name']} with {pro['name']} on {when_str}. Total {int(total)} INR."
    sms = mock_notify("sms", user.get("phone", ""), msg)
    if sms: notifications.append(sms)
    em = mock_notify("email", user.get("email", ""), msg)
    if em: notifications.append(em)
    doc["notifications"] = notifications
    return doc

@api.get("/bookings")
async def my_bookings(user: dict = Depends(get_current_user)):
    items = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("booking_datetime", -1).to_list(200)
    return items

@api.get("/admin/bookings")
async def all_bookings(_: dict = Depends(require_admin)):
    items = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

# -------- Mock Payment --------
@api.post("/payments/process")
async def process_payment(payload: dict, user: dict = Depends(get_current_user)):
    # Mock: always success
    return {
        "success": True,
        "transaction_id": "TXN" + uuid.uuid4().hex[:10].upper(),
        "amount": payload.get("amount", 0),
        "method": payload.get("method", "card"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# -------- Revenue & Targets --------
@api.post("/admin/revenue")
async def add_revenue(data: RevenueIn, _: dict = Depends(require_admin)):
    pro = await db.professionals.find_one({"id": data.professional_id}, {"_id": 0})
    if not pro:
        raise HTTPException(404, "Professional not found")
    doc = {
        "id": str(uuid.uuid4()),
        "professional_id": data.professional_id,
        "professional_name": pro["name"],
        "date": data.date,
        "time": data.time or "",
        "amount": data.amount,
        "target": pro.get("daily_target", 5000),
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.revenue.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/admin/revenue/export.csv")
async def export_revenue_csv(_: dict = Depends(require_admin)):
    from fastapi.responses import PlainTextResponse
    items = await db.revenue.find({}, {"_id": 0}).sort("date", -1).to_list(2000)
    lines = ["Date,Time,Professional,Amount (INR),Target (INR),Achievement %,Notes"]
    total = 0
    for r in items:
        amt = r.get("amount", 0); tgt = r.get("target", 0) or 0
        pct = round((amt / tgt * 100), 1) if tgt else 0
        notes = (r.get("notes", "") or "").replace(",", " ").replace("\n", " ")
        lines.append(f"{r.get('date','')},{r.get('time','') or '-'},{r.get('professional_name','')},{int(amt)},{int(tgt)},{pct}%,{notes}")
        total += amt
    lines.append("")
    lines.append(f"TOTAL,,,{int(total)},,,")
    csv = "\n".join(lines)
    return PlainTextResponse(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=colours-revenue.csv"})

@api.get("/admin/revenue")
async def list_revenue(_: dict = Depends(require_admin), date_filter: Optional[str] = None):
    q = {}
    if date_filter:
        q["date"] = date_filter
    items = await db.revenue.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    return items

@api.delete("/admin/revenue/{rid}")
async def delete_revenue(rid: str, _: dict = Depends(require_admin)):
    await db.revenue.delete_one({"id": rid})
    return {"ok": True}

@api.get("/admin/dashboard")
async def admin_dashboard(_: dict = Depends(require_admin)):
    today = date.today().isoformat()
    today_revenue = await db.revenue.find({"date": today}, {"_id": 0}).to_list(500)
    total_today = sum(r["amount"] for r in today_revenue)
    pros = await db.professionals.find({}, {"_id": 0}).to_list(500)
    total_target = sum(p.get("daily_target", 0) for p in pros)
    # per-pro today
    per_pro = []
    for p in pros:
        amt = sum(r["amount"] for r in today_revenue if r["professional_id"] == p["id"])
        per_pro.append({
            "professional_id": p["id"],
            "name": p["name"],
            "amount": amt,
            "target": p.get("daily_target", 0),
            "percent": round((amt / p["daily_target"] * 100) if p.get("daily_target") else 0, 1),
        })
    recent = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    bookings_count = await db.bookings.count_documents({})
    return {
        "today_revenue": total_today,
        "today_target": total_target,
        "target_percent": round((total_today / total_target * 100) if total_target else 0, 1),
        "per_professional": per_pro,
        "recent_bookings": recent,
        "total_bookings": bookings_count,
        "total_professionals": len(pros),
    }

@api.get("/")
async def root():
    return {"message": "Colours Salon API"}

# -------- Seed --------
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": ADMIN_EMAIL,
            "phone": "",
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}})

async def seed_demo():
    if await db.services.count_documents({}) == 0:
        services = [
            {"id": str(uuid.uuid4()), "name": "Signature Haircut & Style", "category": "Hair", "price": 1200, "duration_min": 60, "description": "Precision cut with luxury styling", "image_url": "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800"},
            {"id": str(uuid.uuid4()), "name": "Hair Color & Highlights", "category": "Hair", "price": 3500, "duration_min": 120, "description": "Premium coloring with global highlights", "image_url": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800"},
            {"id": str(uuid.uuid4()), "name": "Gold Glow Facial", "category": "Skin", "price": 1800, "duration_min": 75, "description": "24K gold radiance facial treatment", "image_url": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800"},
            {"id": str(uuid.uuid4()), "name": "Bridal Makeup", "category": "Makeup", "price": 5500, "duration_min": 150, "description": "Complete bridal beauty experience", "image_url": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800"},
            {"id": str(uuid.uuid4()), "name": "Party Glam Makeup", "category": "Makeup", "price": 2200, "duration_min": 60, "description": "Bold, camera-ready evening look", "image_url": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"},
            {"id": str(uuid.uuid4()), "name": "Hair Stylist Certification", "category": "Academy", "price": 25000, "duration_min": 480, "description": "Professional hair styling course (4 weeks)", "image_url": "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800"},
        ]
        await db.services.insert_many(services)
        sids = [s["id"] for s in services]
        pros = [
            {"id": str(uuid.uuid4()), "name": "Aria Verma", "specialty": "Master Hair Stylist", "bio": "10+ years in luxury hair styling", "image_url": "https://images.unsplash.com/photo-1559069309-020e226c60f6?w=600", "rating": 4.9, "rating_count": 124, "daily_target": 8000, "service_ids": sids[:2], "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Nisha Kapoor", "specialty": "Skin Specialist", "bio": "Dermatology-trained skin expert", "image_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600", "rating": 4.7, "rating_count": 76, "daily_target": 5500, "service_ids": [sids[2]], "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Rhea Singh", "specialty": "Makeup Artist", "bio": "Bridal & celebrity makeup expert", "image_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600", "rating": 4.8, "rating_count": 98, "daily_target": 7000, "service_ids": [sids[3], sids[4]], "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Kiran Mehta", "specialty": "Academy Instructor", "bio": "Lead trainer at Colours Academy", "image_url": "https://images.pexels.com/photos/3993455/pexels-photo-3993455.jpeg?auto=compress&cs=tinysrgb&w=600", "rating": 4.9, "rating_count": 54, "daily_target": 6000, "service_ids": [sids[5]], "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.professionals.insert_many(pros)
        promos = [
            {"id": str(uuid.uuid4()), "code": "WELCOME20", "discount_percent": 20, "description": "20% off your first booking", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "code": "GOLD15", "discount_percent": 15, "description": "Premium member discount", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "code": "WEEKEND10", "discount_percent": 10, "description": "Weekend special offer", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.promos.insert_many(promos)

@app.on_event("startup")
async def startup():
    # drop the strict unique index from older schema if present
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    await db.users.create_index("email", sparse=True)
    await db.users.create_index("phone", sparse=True)
    await seed_admin()
    await seed_demo()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
