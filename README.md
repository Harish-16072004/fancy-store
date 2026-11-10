# Ariya Thangam — Fancy Dress Store & Rental Management

A modern, full-stack costume rental and inventory management system designed for **Ariya Thangam Fancy Dress**. Built with React 19, TypeScript, Tailwind CSS, and Supabase, the application streamlines store counter operations, costume rotation scheduling, pre-bookings, return condition inspections, PDF invoice generation, and Excel reporting.

---

## Key Features

### 📝 Rental Booking & Handover Engine
- **Direct Handover & Pre-Booking Modes:** Seamlessly switch between immediate costume handovers and advance pre-bookings with token payment tracking.
- **Sequential Booking Numbers:** Automatic generation of human-readable ticket numbers (e.g. `#BK-1001`).
- **Dynamic Date-Range Availability:** Prevents double-booking by calculating real-time costume stock across overlapping pickup and return dates.
- **Deposit & Refund Settlement:** Automatic calculation of daily rental charges, refundable security deposits, and deposit return reconciliation upon safe return.
- **Untracked Accessories & Custom Props:** Add freeform props (swords, belts, crowns, caps) directly to any rental ticket.

### 🎭 Costume & Inventory Management
- **Category Organization:** Categorize outfits by custom sections (Animals, Freedom Fighters, Traditional, Fairy Tales, Vegetables, etc.).
- **Size & Stock Tracking:** Track inventory by size (`S`, `M`, `L`) and real-time quantity in stock.
- **Costume Rotation Schedule:** Interactive reservation modal showing booking slots and calendar availability for any costume.
- **Photo Attachments:** Upload costume reference photos directly from mobile devices or desktop.

### 📸 Condition Photos & Dispute Prevention
- **Integrated Web Camera & Uploads:** Capture costume condition photos on pickup and return using the device camera or local file uploads.
- **Comparison Inspection:** Compare return condition directly against handover photos to prevent customer damage disputes.

### 📋 Rentals Registry & Operations
- **Fast Filtering & Search:** Filter by status (`Pre-Booked`, `Active`, `Overdue`, `Returned`) and search across customer names, phone numbers, addresses, and booking numbers.
- **One-Click Actions:** Download PDF invoices, view tickets, edit details, process returns, and settle deposit refunds.
- **Excel (.xlsx) Export:** Export full rental registries or filtered subsets with financial breakdowns.

### 📄 Invoices & Analytics
- **Instant PDF Generation:** Client-side vector PDF invoice generation with shop branding, outfit breakdown, deposit status, and handover notes.
- **Analytics Dashboard:** Visual performance tracking with revenue metrics, active rental counts, overdue alerts, and category distributions.

### 🔒 Enterprise Security & Backup
- **Supabase Authentication:** Secure email/password login for shop operators.
- **Row-Level Security (RLS):** Strict PostgreSQL security policies protecting customer and store data.
- **JSON Backup & Restore:** Complete one-click database export and restore functionality.

### 📱 Responsive Mobile-First Design
- Optimized for mobile touch screens, tablets, and desktop counter workstations with a clean flat-neo design system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage) |
| **State & Data Fetching** | [Zustand](https://zustand.docs.pmnd.rs/) + [TanStack React Query](https://tanstack.com/query) |
| **PDF & Spreadsheets** | [jsPDF](https://github.com/parallax/jsPDF), [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), [XLSX](https://docs.sheetjs.com/) |
| **Icons & Animations** | [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |

---

## Project Structure

```
fancy-store/
├── src/
│   ├── components/
│   │   ├── inventory/
│   │   │   └── InventoryItemForm.tsx      # Add/edit costume outfits
│   │   ├── rental/
│   │   │   ├── CustomerDetailsSection.tsx # Order type, customer info & dates
│   │   │   └── ItemsSelectionSection.tsx  # Costumes picker & custom props
│   │   ├── Analytics.tsx                  # Performance charts & stats
│   │   ├── CameraCapture.tsx              # Web camera & photo uploader
│   │   ├── CostumeScheduleModal.tsx       # Costume rotation timeline inspector
│   │   ├── Dashboard.tsx                  # Main metrics overview
│   │   ├── InventoryManager.tsx           # Outfits & category manager
│   │   ├── LoginPage.tsx                  # Shop staff authentication
│   │   ├── RentalForm.tsx                 # New rental issue slip
│   │   └── RentalsList.tsx                # Rental tickets registry & return handler
│   ├── context/
│   │   └── AuthContext.tsx                # Supabase session provider
│   ├── lib/
│   │   ├── database.ts                    # Supabase CRUD operations & RPC fallback
│   │   ├── storage-bucket.ts              # Supabase photo uploads & URLs
│   │   └── supabase.ts                    # Supabase client initialization
│   ├── utils/
│   │   ├── availability.ts                # Real-time date conflict calculations
│   │   ├── money.ts                       # Currency formatting (INR / ₹)
│   │   ├── pdfGenerator.ts                # Client-side PDF invoice creator
│   │   └── storage.ts                     # Booking number & status utilities
│   ├── App.tsx                            # App shell, navigation & routes
│   └── index.css                          # Tailwind styles & neo design tokens
├── supabase/
│   ├── schema.sql                         # Base database tables, indexes & RLS
│   ├── storage-policies.sql               # Supabase Storage bucket configuration
│   └── migrations/
│       └── 01_process_rental_checkout.sql # Atomic checkout stored procedure
├── .env.local                             # Local environment variables
├── package.json
└── vite.config.ts
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm**
- A **Supabase** project

### 2. Environment Configuration
Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Setup (Supabase)
Run the provided SQL scripts in your **Supabase SQL Editor**:

1. **`supabase/schema.sql`**: Creates tables (`categories`, `inventory_items`, `rentals`, `rental_items`, `additional_items`, `rental_photos`), indexes, and Row-Level Security policies.
2. **`supabase/storage-policies.sql`**: Configures storage buckets for costume and condition photos.
3. **`supabase/migrations/01_process_rental_checkout.sql`**: Sets up the atomic checkout stored procedure (`process_rental_checkout`).

### 4. Installation & Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

The app will start at `http://localhost:3000`.

### 5. Production Build

```bash
# Type-check and build for production
npm run build

# Preview production build locally
npm run preview
```

---

## License & Operations

Private operations software for **Ariya Thangam Fancy Dress**. All rights reserved.
