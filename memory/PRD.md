# Colours — Salon Management & Booking App

## Overview
Luxury salon management & booking mobile app branded **COLOURS** (tagline: HAIR · SKIN · MAKEUP · ACADEMY). Expo SDK 54 + FastAPI + MongoDB. Currency INR ₹. Theme: dark + gold (Jewel & Luxury). Two roles: Customer (User) and Salon Owner (Admin).

## User Features
- Register with **mobile number (primary)** + name + password; email is optional
- Login with phone OR email (smart identifier detection) + password
- Browse services across categories: **Hair / Skin / Makeup / Academy**
- Browse top professionals with ratings
- Book appointment: select service → professional → date/time → apply promo → mock 30% advance payment
- Promo banner on home (WELCOME20 / GOLD15 / WEEKEND10)
- View my bookings with status, paid advance, applied promo
- Booking confirmation via **mock SMS + Email** (sent to phone & optional email)
- Profile shows mobile + email

## Admin Features
- Login (admin role auto-redirects)
- Dashboard: today's revenue, target progress (overall + per-staff bars), recent bookings, totals
- Manage Services (Add / Delete) — categories: Hair, Skin, Makeup, Academy
- Manage Staff (Add / Rate / Delete)
- Daily Revenue logging per professional with target tracking
- Promo code management (Create / Delete)
- View all bookings

## Mock Integrations
- **Payments** at `/api/payments/process` — MOCKED (returns success). Swap with Stripe/Razorpay later.
- **SMS / Email confirmations** — MOCKED. The backend logs `[MOCK SMS]` / `[MOCK EMAIL]` lines on register + on booking. Booking response returns a `notifications` array describing what would be sent. To go live: plug Twilio (SMS) and Resend/SendGrid (Email) inside the `mock_notify()` helper in `server.py`.

## Auth
- JWT Bearer tokens, 7-day expiry, AsyncStorage on mobile
- Phone is the primary identifier; email is optional
- Admin seeded on startup from `.env` (admin@salon.com / admin123)

## APK Build Note
App `name`/`slug` set to "Colours" in `app.json`. To generate APK: Save to GitHub → run `eas build --platform android` (or use Emergent Mobile Publish).
