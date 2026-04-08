# StorageHunter Pro - Product Requirements Document

## Original Problem Statement
Create a clean, modern, mobile-friendly web app called "StorageHunter Pro" with dark-mode UI (blues/greens profit theme) that helps users find and evaluate self-storage auction units with high profit potential.

## User Choices
- PIN code protection for Admin (default: 1234)
- Empty/customizable county list
- Mobile-app friendly colors
- Extraordinary Deals window with configurable thresholds
- Cheapest LLM (Gemini 3 Flash via Emergent LLM key)

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Integration**: Gemini 3 Flash via Emergent LLM key

## Core Features Implemented

### AI Agents
1. **StorageBid Hunter** - Initial scanner
   - Analyzes auction listings
   - Predictability Score (1-10)
   - Initial recommendation (PROMISING/MAYBE/PASS)
   - Visible items categorization
   - Red flags detection

2. **StorageProfit Optimizer** - Deep analysis
   - Value breakdown by category
   - Resale strategy recommendations
   - Cost analysis (transport, cleanup, disposal)
   - Risk assessment
   - Final Go/No-Go verdict
   - Max bid recommendation

### Pages
- **Dashboard**: Stats, Hot Deals, Quick Actions
- **Scan**: URL input, AI analysis trigger
- **My Bids**: Saved units, published units view
- **Admin**: PIN protected, Find Units, Review Queue, Settings, Location, Hot Deals config

### Workflow
1. User/Admin pastes auction URLs
2. StorageBid Hunter runs analysis
3. Promising units → StorageProfit Optimizer
4. Results → Admin Review Queue
5. Admin approves/rejects
6. Approved units → Published (visible to users)

### Data Storage
- MongoDB: analyzed_units, my_bids, status_checks
- LocalStorage: settings, hot deal thresholds, admin PIN

## API Endpoints
- POST /api/scan - Trigger AI analysis
- GET /api/review-queue - Admin pending units
- POST /api/review-queue/action - Approve/reject
- GET /api/published-units - Public units
- GET/POST/DELETE /api/my-bids - User's saved bids
- GET /api/stats - Dashboard statistics

## What's Been Implemented (Jan 2026)
- ✅ Full UI skeleton with navigation
- ✅ PIN-protected Admin dashboard
- ✅ Two AI agents integrated (Gemini 3 Flash)
- ✅ Duplicate detection by auction ID
- ✅ Admin review queue workflow
- ✅ Hot deal detection with configurable thresholds
- ✅ Mobile-responsive bottom navigation
- ✅ Desktop sidebar navigation
- ✅ All settings persist in localStorage

## Backlog
### P0 (Critical)
- None - MVP complete

### P1 (Important)
- Real auction URL scraping (currently simulated)
- Photo analysis with vision models
- Push notifications for hot deals

### P2 (Nice to Have)
- PDF export of analysis
- Manual photo upload
- Price history tracking
- Won auction inventory tracking

## Test Credentials
- Admin PIN: 1234
