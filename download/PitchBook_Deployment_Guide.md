# 🏟️ PitchBook — Full Production Deployment Guide

> **Next.js 16 Game Venue Booking App | Nepal-Based Solo Developer**
> *Research compiled: July 2025 — pricing reflects 2025–2026 rates*

---

## 📋 Table of Contents

1. [App Hosting](#1--app-hosting-frontend--backend)
2. [Database (PostgreSQL)](#2--database-postgresql---production-replacement-for-sqlite)
3. [Payment Gateway](#3--payment-gateway-for-nepal--international)
4. [Domain & DNS](#4--domain--dns)
5. [Real-Time Services](#5--real-time-services-for-live-booking-updates)
6. [File Storage](#6--file-storage-venue-images-user-avatars)
7. [Email Service](#7--email-service-booking-confirmations)
8. [Authentication](#8--authentication-production-grade)
9. [Monitoring & Analytics](#9--monitoring--analytics)
10. [Mobile App (Future)](#10--mobile-app-future)
11. [Recommended Starter Stack & Cost Summary](#11--recommended-starter-stack--cost-summary)
12. [Scaling Roadmap](#12--scaling-roadmap)

---

## 1. 🖥️ APP HOSTING (Frontend + Backend)

| Platform | Free Tier | Hobby/Basic | Pro/Mid-tier | Model | Next.js 16 Support |
|---|---|---|---|---|---|
| **Vercel** | $0 forever (100GB bw, serverless funcs) | $20/user/mo | $20/user/mo + usage | Per-seat + usage | ⭐⭐⭐⭐⭐ (Official) |
| **Netlify** | $0 (100GB bw, 300 build min) | $0 (basic) | $19+/mo | Tiered | ⭐⭐⭐⭐ (SSR limited) |
| **Railway** | $5 credit trial (30 days) | $5/mo credit | $20/mo credit | Usage-based (CPU/RAM) | ⭐⭐⭐⭐ |
| **Render** | $0 (30-day limit, 256MB RAM) | $6/mo (256MB) | $19/mo (1GB) | Per-service | ⭐⭐⭐⭐ |
| **DigitalOcean App** | Static only free | $5/mo (512MB) | $12/mo (1GB) | Per-component | ⭐⭐⭐ |
| **AWS Amplify** | $200 credits (12 mo) | Pay-as-you-go | ~$10-30/mo | Usage (build min, bw) | ⭐⭐⭐⭐ |
| **Google Cloud Run** | 240K vCPU-sec + 450K GB-sec free/mo | Pay-as-you-go | ~$5-20/mo | Per-request | ⭐⭐⭐ |
| **Cloudflare Pages** | $0 (unlimited bw, 100K req/day) | $5/mo (Workers) | $5+/mo | Per-request | ⭐⭐⭐ (improving) |

### Vercel — Deep Dive (Recommended)
| Metric | Hobby (Free) | Pro ($20/user/mo) | Enterprise |
|---|---|---|---|
| Bandwidth | 100 GB | 1 TB | Custom |
| Serverless Function Executions | Included | $40/1M extra | Custom |
| Serverless Function Duration | 10s (Hobby), 60s (Pro) | 60s | Custom |
| Build Minutes | 6,000/mo | 15,000/mo | Custom |
| Edge Functions | 500K req/mo | 4M req/mo | Custom |
| Staging/Preview | Unlimited | Unlimited | Custom |
| Custom Domains | Unlimited | Unlimited | Unlimited |
| Team Members | 1 | $20/seat/mo | Custom |
| **Annual Cost (1 dev)** | **$0** | **$240/yr** | Custom |

### ⚡ Quick Comparison
| Criteria | Best Pick |
|---|---|
| **Best for Next.js** | Vercel (official, zero-config) |
| **Best free tier** | Cloudflare Pages (unlimited bw) or Vercel |
| **Most flexible** | Railway (full backend freedom) |
| **Best value scaling** | Render ($6/mo for 24/7 server) |
| **Best for Nepal latency** | Vercel (global edge) or Cloudflare |
| **Easiest for solo dev** | Vercel (deploy in 30 seconds) |

**✅ RECOMMENDATION: Vercel Hobby (free tier) → Vercel Pro ($20/mo) when revenue starts**

---

## 2. 🗄️ DATABASE (PostgreSQL — Production Replacement for SQLite)

| Provider | Free Tier | Pro Tier | Storage (Free) | Connections (Free) | Best For |
|---|---|---|---|---|---|
| **Supabase** ⭐ | $0 forever | $25/mo | 500 MB | 500K MAU, unlimited API | All-in-one (DB + Auth + Storage + RT) |
| **Neon** ⭐ | $0 forever | ~$15/mo typical | 0.5 GB/branch | 100 CU-hr/project | Serverless, branching, edge |
| **Railway** | Included in trial | $5/mo credit | 0.5 GB vol | Shared | Simple setup on Railway |
| **Render** | 90-day free PostgreSQL | $7/mo | 90 days free, then paid | 20 connections | Easy Render integration |
| **PlanetScale** | ❌ Removed (Apr 2024) | $50/mo (Scaler) | N/A | N/A | NOT recommended (MySQL only, no free tier) |
| **Amazon RDS** | $100 credits (6 mo) | ~$15-50/mo | Free tier (db.t3.micro) | Varies | AWS ecosystem |
| **Google Cloud SQL** | $300 credits | ~$11-50/mo | Free tier (db-f1-micro) | Varies | GCP ecosystem |

### Supabase — Deep Dive (Recommended for PitchBook)
| Feature | Free | Pro ($25/mo) |
|---|---|---|
| Database Size | 500 MB | 8 GB |
| File Storage | 1 GB | 100 GB |
| Bandwidth | 5 GB | 250 GB |
| Monthly Active Users | 50,000 | 100,000 |
| API Requests | Unlimited | Unlimited |
| Realtime Connections | 200 | 500 |
| Edge Functions | 500K invocations | 2M invocations |
| Backups | 7-day (daily) | 7-day (daily) |
| Support | Community | Email |
| Projects | 2 | Unlimited |

### Neon — Deep Dive (Strong Alternative)
| Feature | Free | Launch (~$15/mo) |
|---|---|---|
| Compute (CU-hr/project) | 100 CU-hr/mo | 300 CU-hr included |
| Storage per branch | 0.5 GB | 10 GB included |
| Branches per project | 10 | Unlimited |
| Projects | 20 | Unlimited |
| Egress | 5 GB/mo | Pay-as-go |
| Connection Pooling | Included | Included |
| **Killer Feature** | Branching (dev/preview DBs) | Autoscaling to zero |

**✅ RECOMMENDATION: Supabase Free → Pro ($25/mo). You get DB + Auth + Storage + Realtime + Edge Functions in ONE platform. Best value for a solo Nepal developer. Neon as a backup if you want pure PostgreSQL.**

---

## 3. 💳 PAYMENT GATEWAY (for Nepal + International)

### Nepal-Local Gateways

| Gateway | Setup Fee | Transaction Fee | Settlement | Integration | Nepal-Only? |
|---|---|---|---|---|---|
| **Khalti** ⭐ | Free | NPR 5-10/txn (KPG gateway) | T+1 to T+2 | REST API, SDKs, Webhook | Yes |
| **eSewa** ⭐ | Free (was ~NPR 10K-15K, now free merchant integration) | 1.75% load fee (user side); merchant fees vary | T+1 to T+3 | API, Webhook, SDKs | Yes |
| **IME Pay** | ~NPR 5,000 | Competitive (2-3%) | T+1 to T+2 | API (now merging into Khalti) | Yes |
| **Fonepay** | Via bank partner | ~2% | Varies | Bank-specific API | Yes (via banks) |

### International Gateways

| Gateway | Setup Fee | Transaction Fee | Nepal Support? | Notes |
|---|---|---|---|---|
| **Stripe** | $0 | 2.9% + $0.30 (domestic), 3.1% + $0.30 (intl) + 1.5% cross-border | ❌ NOT available in Nepal | Requires US/UK/Singapore entity |
| **PayPal** | $0 | 2.9% + $0.30 (domestic), 4.4% + fixed fee (intl) | ⚠️ Limited (send/receive, no full merchant) | Nepali users can send, not fully receive as merchant |
| **Razorpay** (India) | $0 | 2% (UPI), 3% (intl cards) | ❌ India only | Good if targeting Indian users |
| **CCAvenue** | ~$0 | 2-3% | ❌ India only | Popular in South Asia |

### Critical Nepal Context
> **Stripe does NOT operate in Nepal.** You cannot register as a Stripe merchant from Nepal. You'd need:
> 1. A US LLC or UK Ltd company (costs ~$300-800 to incorporate)
> 2. A foreign bank account (Mercury, Wise Business)
> 3. This is doable but adds complexity and cost

### Payment Strategy for PitchBook
| User Segment | Gateway | Why |
|---|---|---|
| **Nepal users** | Khalti + eSewa | Direct integration, Nepali users already have these |
| **International users** | Stripe (via foreign entity) | Only if you incorporate abroad |
| **Tourists in Nepal** | Khalti (supports intl cards via KPG) | Easiest path |

**✅ RECOMMENDATION: Start with Khalti (easiest, most popular in Nepal). Add eSewa as second. Plan for Stripe only when you have a foreign entity. Budget: NPR 0 for integration (both are free to set up).**

---

## 4. 🌐 DOMAIN & DNS

| Registrar | .com Registration | .com Renewal | .np Support | Notes |
|---|---|---|---|---|
| **Cloudflare Registrar** ⭐ | ~$10.50/yr | ~$10.50/yr | ❌ | At-cost pricing, no markup |
| **Porkbun** ⭐ | ~$9.43/yr | ~$11.38/yr | ❌ | Cheapest renewals, WHOIS privacy free |
| **Namecheap** | ~$8.88/yr (promo) → ~$13.98/yr renewal | ~$13.98/yr | ❌ | Popular, good UX |
| **GoDaddy** | ~$2.99/yr (1st yr) → ~$20.99/yr | ~$20.99/yr | ❌ | Expensive renewals, aggressive upsells |
| **Google Domains** | N/A (sold to Squarespace) | N/A | ❌ | Discontinued |
| **Squarespace** | ~$10-15/yr | ~$15-20/yr | ❌ | New home of Google Domains |

### Nepal .np Domain
| Provider | Registration | Notes |
|---|---|---|
| **Mercantile Communications** (official .np registry) | **FREE** | .np domains are free for Nepali citizens/businesses. Requires citizenship/business registration document. |
| International registrars | $195/yr | Not recommended — use Mercantile directly |

### .np Registration Process
1. Visit [register.mos.com.np](https://register.mos.com.np)
2. Create account with Nepali citizenship/business cert
3. Choose your domain (e.g., `pitchbook.com.np`)
4. Completely FREE — no registration or renewal fees
5. Point nameservers to Cloudflare for DNS management

**✅ RECOMMENDATION: Get .np domain FREE via Mercantile + buy .com on Porkbun (~$9/yr) for international reach. Use Cloudflare for DNS (free, fastest globally).**

---

## 5. ⚡ REAL-TIME SERVICES (Live Booking Updates)

| Service | Free Tier | Paid Starter | Model | Next.js Integration |
|---|---|---|---|---|
| **Supabase Realtime** ⭐ | 200 conn, 2M messages/mo | Included in Pro ($25/mo) | Included with Supabase | ⭐⭐⭐⭐⭐ (built-in) |
| **Pusher** | Free (200K msgs/day) | $49/mo (1M msgs) | Per-message | ⭐⭐⭐⭐⭐ |
| **Ably** | Free (6M msgs/mo) | ~$50/mo | Per-connection-minute | ⭐⭐⭐⭐ |
| **Firebase RTDB** | 1 GB stored, 10 GB/mo download | Pay-as-you-go | Usage-based | ⭐⭐⭐ (different ecosystem) |
| **Socket.io (self-hosted)** | Free (runs on your server) | Server cost ($5-20/mo) | Self-hosted | ⭐⭐⭐⭐ (manual setup) |

### Why Supabase Realtime Wins Here
- Already using Supabase for DB → **zero additional cost**
- Listens to PostgreSQL changes automatically (via WAL)
- Built-in presence, broadcast, and channels
- Works perfectly with Next.js 16 Server Components

**✅ RECOMMENDATION: Supabase Realtime (free with your Supabase plan). No additional service needed.**

---

## 6. 📁 FILE STORAGE (Venue Images, User Avatars)

| Service | Free Tier | Storage (Free) | Bandwidth (Free) | Next.js Integration |
|---|---|---|---|---|
| **Supabase Storage** ⭐ | Included | 1 GB | 2 GB bw | ⭐⭐⭐⭐ (built-in) |
| **Cloudinary** | Free forever | 25 GB (credits) | 25 GB/mo | ⭐⭐⭐⭐⭐ (image transforms) |
| **Uploadthing** | Free tier | 2 GB | Limited | ⭐⭐⭐⭐⭐ (easiest Next.js) |
| **Vercel Blob** | Not free | $0.023/GB/mo | $0.06/GB egress | ⭐⭐⭐⭐ (Vercel native) |
| **AWS S3** | 12 mo free (5 GB) | $0.023/GB/mo | $0.09/GB | ⭐⭐⭐ (manual setup) |

### Cloudinary — Why It's Special
- **Automatic image optimization**: Resize, crop, format conversion on-the-fly
- **CDN delivery**: Global edge caching
- **Transformations in URL**: `https://res.cloudinary.com/.../w_400,q_80/venue.jpg`
- Free tier: 25 GB storage, 25 GB bandwidth, 25,000 transformations/month

### Uploadthing — Why It's Easy
- Purpose-built for Next.js
- Drag & drop component
- Built-in upload progress
- File type validation

**✅ RECOMMENDATION: Supabase Storage (free, already in stack) for MVP. Upgrade to Cloudinary ($0) when you need image transformations and optimization. Uploadthing if you want the easiest Next.js file upload DX.**

---

## 7. 📧 EMAIL SERVICE (Booking Confirmations)

| Service | Free Tier | Pro Tier | Emails (Free) | Notes |
|---|---|---|---|---|
| **Resend** ⭐ | $0/mo | $20/mo | 3,000/mo (100/day) | React Email support, beautiful DX |
| **SendGrid** | ⚠️ Free tier REMOVED (May 2025) | $15/mo | 100 (trial only) | Was great, now paid-only |
| **Amazon SES** | Free for EC2 ($0.10/1K otherwise) | $0.10/1K emails | 3,000/mo (EC2) | Cheapest at scale, complex setup |
| **Mailgun** | $0 (12 mo flex plan) | $35/mo | 1,000/mo | Good API, reliable |
| **Postmark** | 100/mo (test) | $15/mo | 100/mo (test only) | Fastest delivery, great support |

### Resend — Deep Dive (Recommended)
| Feature | Free | Pro ($20/mo) |
|---|---|---|
| Emails/mo | 3,000 | 50,000 |
| Domains | 1 | 5 |
| Team Members | 1 | 5 |
| Contact Support | Community | Email |
| **Killer Feature** | React Email templates | React Email + analytics |

### Email Volume Estimates for PitchBook
| Stage | Monthly Emails | Best Plan |
|---|---|---|
| MVP (0-100 bookings/mo) | 200-500 | Resend Free ✅ |
| Growth (100-1000 bookings/mo) | 1,000-5,000 | Resend Free ✅ |
| Scale (1000+ bookings/mo) | 5,000-50,000 | Resend Pro ($20/mo) |
| Enterprise | 50,000+ | Amazon SES ($5-10/mo) |

**✅ RECOMMENDATION: Resend (free for first 3,000 emails/mo). Perfect React Email integration with Next.js. Scale to Amazon SES only if costs become an issue.**

---

## 8. 🔐 AUTHENTICATION (Production-Grade)

| Service | Free Tier | Pro Tier | MAU (Free) | Next.js 16 Support | Setup Time |
|---|---|---|---|---|---|
| **NextAuth.js / Auth.js** ⭐ | $0 forever | Self-hosted | Unlimited | ⭐⭐⭐⭐⭐ (native) | 1-2 hours |
| **Clerk** ⭐⭐ | $0/mo | $20/mo | 50,000 MRU | ⭐⭐⭐⭐⭐ (best DX) | 15 minutes |
| **Supabase Auth** | $0 (included) | $25/mo | 50,000 MAU | ⭐⭐⭐⭐ | 30 minutes |
| **Firebase Auth** | $0/mo | Pay-as-go | 50,000 MAU | ⭐⭐⭐ (different stack) | 30 minutes |
| **Auth0** | $0/mo | $25/mo | 25,000 MAU | ⭐⭐⭐⭐ | 30 minutes |

### NextAuth.js (Auth.js) — Why It's the Budget Pick
- **Completely free**, open-source
- Native Next.js App Router support
- Works with ANY database (including Supabase PostgreSQL)
- Custom providers: email, Google, GitHub, credentials
- If using Supabase, you already have Supabase Auth as an alternative

### Clerk — Why It's the DX Pick
- Drop-in `<ClerkProvider>` component
- Pre-built UI components (Sign In, Sign Up, User Button)
- Phone/Email OTP (great for Nepal users)
- User management dashboard
- Organization/team support (great for venue owners)

### What About Nepal Users?
- Most Nepali users use email + OTP or phone number
- Clerk supports phone OTP out of the box
- Google OAuth is very popular in Nepal
- Both NextAuth and Clerk support Google sign-in

**✅ RECOMMENDATION: Clerk Free tier (50K users free, beautiful UI, 15-min setup). Use Supabase Auth if you want everything in one platform. NextAuth.js if you want zero cost at any scale.**

---

## 9. 📊 MONITORING & ANALYTICS

### Error Tracking

| Service | Free Tier | Paid Starter | Events (Free) | Notes |
|---|---|---|---|---|
| **Sentry** ⭐ | 14-day trial, then limited | $26/mo | 5K errors/mo (after trial) | Industry standard for Next.js |
| **Supabase Edge** | Included | $25/mo | N/A | Basic error logging |

### Analytics

| Service | Free Tier | Paid | Pageviews (Free) | Privacy | Notes |
|---|---|---|---|---|---|
| **Google Analytics** ⭐ | $0 forever | $0 | Unlimited | ❌ (Google data) | Most comprehensive, free |
| **PostHog** ⭐⭐ | $0/mo | Pay-as-go | 1M events/mo | ✅ Cookie banner optional | All-in-one: analytics + session replay + feature flags + A/B testing |
| **Plausible** | Self-host only (free) | $9/mo (10K pageviews) | N/A (paid cloud) | ✅ (GDPR) | Lightweight, privacy-focused |
| **Vercel Analytics** | Included (Pro) | $20/mo (Pro plan) | N/A (Pro plan) | ✅ | Web Vitals + custom events |
| **Umami** ⭐ | Self-host free | $9/mo (cloud) | Unlimited (self-host) | ✅ | Open-source, lightweight |

### PostHog — Deep Dive (Best Value)
| Feature | Free Tier |
|---|---|
| Product Analytics | 1M events/mo |
| Session Replay | 5K recordings/mo |
| Feature Flags | 1M requests/mo |
| A/B Testing | Billed with feature flags |
| Error Tracking | 1K errors/mo |
| Data Pipelines | 10K events/mo |
| **Cost** | **$0 (no credit card needed)** |

**✅ RECOMMENDATION: Google Analytics (free, unlimited) + PostHog (free tier for events, session replay, and feature flags). Add Sentry only when you can afford $26/mo or when you encounter frequent production errors.**

---

## 10. 📱 MOBILE APP (Future)

| Option | Cost | Time to Build | Performance | Offline | App Store? |
|---|---|---|---|---|---|
| **PWA** ⭐ | $0 | 1-3 days (with Next.js) | Good | ✅ Service Worker | ✅ (via TWA) |
| **Capacitor / Ionic** | $0 (open source) | 1-2 weeks | Good (WebView) | ✅ | ✅ (iOS + Android) |
| **React Native / Expo** ⭐⭐ | $0 (open source) + $0-30/mo (EAS Build) | 4-8 weeks | Native | ✅ | ✅ (native build) |
| **Flutter** | $0 (open source) | 6-10 weeks | Best | ✅ | ✅ (native build) |

### Why PWA First (Smartest for PitchBook)
- **$0 cost** — same Next.js codebase
- **Installable** on Android via TWA (Trusted Web Activity)
- **Works offline** with service workers
- **No App Store review** for Android
- **Share 90% code** with web app
- Can upgrade to Capacitor or React Native later

### If You Need Native App
| Option | Annual Cost | Nepal Context |
|---|---|---|
| Google Play Console | $25 (one-time) | Required for Android |
| Apple Developer Program | $99/yr | Required for iOS |
| Expo EAS Build (optional) | $0-30/mo | CI/CD for React Native |

**✅ RECOMMENDATION: PWA first ($0, 1-3 days). Add Capacitor wrapper ($0) for Play Store listing ($25 one-time). Upgrade to React Native only if you need truly native performance.**

---

## 11. 💰 RECOMMENDED STARTER STACK & COST SUMMARY

### 🏆 The "Zero to Launch" Stack (FREE)

| Category | Service | Monthly Cost | Annual Cost |
|---|---|---|---|
| App Hosting | **Vercel Hobby** | **$0** | **$0** |
| Database | **Supabase Free** | **$0** | **$0** |
| Authentication | **Clerk Free** (or Supabase Auth) | **$0** | **$0** |
| File Storage | **Supabase Storage** | **$0** | **$0** |
| Real-time | **Supabase Realtime** | **$0** | **$0** |
| Email | **Resend Free** | **$0** | **$0** |
| Domain (.np) | **Mercantile** | **$0** | **$0** |
| Domain (.com) | **Porkbun** | — | **~$9/yr** |
| DNS | **Cloudflare** | **$0** | **$0** |
| Analytics | **Google Analytics + PostHog** | **$0** | **$0** |
| Payments (Nepal) | **Khalti** | **$0** setup | **$0** |
| Mobile | **PWA** | **$0** | **$0** |
| | | | |
| **TOTAL (Year 1)** | | **$0/mo** | **~$9/yr** |

### 📈 Growth Stack (When You Hit 500+ Monthly Users)

| Category | Upgrade To | Monthly Cost |
|---|---|---|
| App Hosting | Vercel Pro | $20/mo |
| Database | Supabase Pro | $25/mo |
| Email | Resend Pro | $20/mo |
| Payments | Add eSewa | $0 (free integration) |
| Error Tracking | Sentry | $26/mo |
| | | |
| **TOTAL** | **~$91/mo** | **~$1,092/yr** |

### 🚀 Scale Stack (When You Have 5,000+ Monthly Users)

| Category | Upgrade To | Monthly Cost |
|---|---|---|
| App Hosting | Vercel Pro + Edge | $20 + usage |
| Database | Supabase Pro + Point-in-Time Recovery | $25 + usage |
| File Storage | Cloudinary (image optimization) | $0 (free tier) or $89/mo |
| Email | Amazon SES | ~$5-10/mo |
| Payments | Khalti + eSewa + Stripe (foreign entity) | $0 + entity costs |
| CDN | Cloudflare Pro | $20/mo |
| | | |
| **TOTAL** | **~$100-200/mo** | **~$1,200-2,400/yr** |

---

## 12. 🗺️ Scaling Roadmap

### Phase 1: MVP Launch (Week 1-4) — $9/yr total
```
✅ Vercel Hobby (free)
✅ Supabase Free (DB + Auth + Storage + Realtime)
✅ Resend Free (3,000 emails/mo)
✅ Khalti Payment Gateway (free setup)
✅ Mercantile .np domain (free)
✅ Porkbun .com domain ($9/yr)
✅ Cloudflare DNS (free)
✅ PWA (free)
✅ Google Analytics + PostHog (free)
```

### Phase 2: Growth (Month 2-6) — ~$91/mo
```
🔄 Vercel Pro ($20/mo) — custom domains, more bandwidth
🔄 Supabase Pro ($25/mo) — 8GB DB, daily backups
🔄 Resend Pro ($20/mo) — 50,000 emails
🔄 Add eSewa gateway (free)
🔄 Add Sentry ($26/mo) — error tracking
```

### Phase 3: Scale (Month 6-12) — ~$100-200/mo
```
🔄 Cloudinary for image optimization (free or $89/mo)
🔄 Amazon SES for bulk emails ($5-10/mo)
🔄 Add Stripe (requires foreign entity — $300-800 setup)
🔄 Google Play Store listing ($25 one-time)
🔄 Capacitor wrapper for native Android ($0)
```

### Phase 4: Enterprise (Year 2+) — ~$300-500/mo
```
🔄 Dedicated server/VPS if needed ($20-50/mo)
🔄 Redis caching ($0-15/mo via Upstash)
🔄 CDN optimization ($20/mo Cloudflare Pro)
🔄 iOS App Store ($99/yr)
🔄 React Native rewrite for native apps (time investment)
```

---

## 🔑 Critical Nepal-Specific Notes

1. **Stripe is NOT available in Nepal** — You cannot accept international payments directly. Options:
   - Incorporate a US LLC ($300-800 via Stripe Atlas or Firstbase.io)
   - Use payment aggregators like Paddle or Lemon Squeezy
   - Accept Nepal payments only via Khalti/eSewa

2. **.np domains are FREE** — Register via Mercantile Communications with your citizenship

3. **Khalti is the most popular digital wallet** — ~15M+ users in Nepal, essential for any Nepali app

4. **International credit card required** for many services (Vercel Pro, Supabase Pro, Clerk Pro) — Get a dollar card from NIC Asia, Nabil Bank, or Global IME Bank

5. **Data residency** — Supabase lets you choose data center region. Choose **Singapore (ap-southeast-1)** for best latency from Nepal (~100-150ms)

6. **Nepal time (UTC+5:45)** — All your cron jobs and scheduled tasks should account for this unique timezone

---

## 📝 Quick Integration Checklist

- [ ] **Vercel**: `npx vercel` — deploy in 30 seconds
- [ ] **Supabase**: Create project, get connection string, update Prisma schema
- [ ] **Prisma Migration**: Change from SQLite to PostgreSQL adapter
- [ ] **Clerk**: Install `@clerk/nextjs`, add `<ClerkProvider>`
- [ ] **Resend**: Install `resend`, configure DNS records
- [ ] **Khalti**: Register merchant account, get API keys
- [ ] **Cloudinary**: Set up transform URLs for venue images
- [ ] **PostHog**: Add `posthog-js` script
- [ ] **PWA**: Add `next-pwa` or use `@serwist/next` for service worker

---

*This guide was compiled using current pricing data as of July 2025. Prices may change — always verify on official websites before making purchasing decisions.*
