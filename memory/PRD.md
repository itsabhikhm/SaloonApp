# Luxe Salon — Product Requirements

## Overview
Luxury salon management & booking mobile app (Expo React Native + FastAPI + MongoDB) with dual interfaces: customer (User) and salon owner (Admin). Currency INR ₹. Theme: dark + gold luxury (Jewel & Luxury).

## User Features
- Register / login (JWT, AsyncStorage persistence)
- Browse services across categories (Hair / Spa / Nails / Facial)
- Browse top professionals with ratings
- Book appointment: select service → professional → date/time → apply promo → mock advance payment (30%)
- Promo banner on home with active codes
- View my bookings with status, paid advance, applied promo
- Profile with logout

## Admin Features
- Login (admin role auto-redirects)
- Dashboard: today's revenue, target progress (overall + per-staff bars), recent bookings, totals
- Manage Services (CRUD)
- Manage Staff/Professionals (CRUD + rating)
- Daily Revenue logging per professional (with target tracking)
- Promo code management (CRUD)
- View all bookings

## Mock Integrations
- Payment is **MOCKED** at `/api/payments/process` (returns success). Easy to swap with Stripe later.

## Auth
- JWT Bearer tokens, 7-day expiry, AsyncStorage on mobile
- Admin seeded on startup from `.env`
