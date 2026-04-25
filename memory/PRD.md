# Colours — Salon Management & Booking App

## Overview
Luxury salon management & booking mobile app branded **COLOURS** (tagline: HAIR · SKIN · MAKEUP · ACADEMY). Expo SDK 54 + FastAPI + MongoDB. Currency INR ₹. Theme: dark + gold (Jewel & Luxury). Two roles: Customer (User) and Salon Owner (Admin).

## User Features
- Register / login (JWT, AsyncStorage persistence)
- Browse services across categories: **Hair / Skin / Makeup / Academy**
- Browse top professionals with ratings
- Book appointment: select service → professional → date/time → apply promo → mock 30% advance payment
- Promo banner on home with active codes (WELCOME20 / GOLD15 / WEEKEND10)
- View my bookings with status, paid advance, applied promo
- Profile with logout

## Admin Features
- Login (admin role auto-redirects to admin tabs)
- Dashboard: today's revenue, target progress (overall + per-staff bars), recent bookings, totals
- Manage Services (Add / Delete) — categories: Hair, Skin, Makeup, Academy
- Manage Staff/Professionals (Add / Rate / Delete)
- Daily Revenue logging per professional with target tracking
- Promo code management (Create / Delete)
- View all bookings

## Mock Integrations
- Payment is **MOCKED** at `/api/payments/process` (returns success with fake transaction_id). Easy to swap with Stripe/Razorpay later.

## Auth
- JWT Bearer tokens, 7-day expiry, AsyncStorage on mobile
- Admin seeded on startup from `.env` (admin@salon.com / admin123)

## APK Build Note
App `name`/`slug` set to "Colours" in `app.json`. To generate APK, use Emergent's Mobile Publish or `eas build --platform android` from your account.
