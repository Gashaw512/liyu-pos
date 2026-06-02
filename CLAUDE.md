@AGENTS.md


# Liyu POS — Complete Production Architecture & PRD
### Enterprise SaaS for Ethiopian Businesses
**Version 1.0 | Confidential**

---

## Table of Contents

1. Product Vision & Strategy
2. UX Architecture
3. Design System
4. Folder Structure
5. Database Schema (PostgreSQL / Supabase)
6. Supabase Security (RLS + Auth)
7. Zustand State Management
8. Offline-First Architecture
9. i18n Architecture
10. Component Library
11. Screen-by-Screen Specification
12. Security Architecture
13. Performance Strategy
14. Development Roadmap

---

# 1. PRODUCT VISION & STRATEGY

## Mission
Liyu POS ("Special POS" in Amharic) is a mobile-first, offline-capable Point of Sale and business intelligence platform built exclusively for Ethiopian SMEs. It replaces paper notebooks and broken Excel sheets with a beautiful, intuitive system that works even when internet is gone.

## Target Market
| Segment | Size (Ethiopia) | Priority |
|---|---|---|
| Bars & Tej Bets | ~80,000 | Primary |
| Restaurants | ~60,000 | Primary |
| Cafes & Coffee Houses | ~40,000 | Primary |
| Small Hotels (1–3 star) | ~15,000 | Secondary |
| Kiosks & Mini-Markets | ~200,000 | Tertiary |

## Business Model
- **Starter**: Free (1 user, 50 products)
- **Business**: 999 ETB/month (5 users, unlimited products)
- **Pro**: 2,499 ETB/month (unlimited users, multi-branch, API)

## Core Value Propositions
1. Works offline — critical for Addis infrastructure
2. Amharic-first UI — not an afterthought
3. Ethiopian payment methods built in (Telebirr, CBE Birr)
4. Loss detection — catches employee theft automatically
5. Zero training needed — big buttons, icons everywhere

---

# 2. UX ARCHITECTURE

## User Flows

### Flow 1: First-Time Owner Setup
```
Landing → Register → Verify Phone (OTP) → Business Setup Wizard
  → Add Products → Invite Staff → Dashboard
```

### Flow 2: Daily Cashier Workflow
```
Login → Open Shift → Enter Opening Cash
  → Record Sales (loop) → Close Shift → Enter Actual Cash
  → System Shows Discrepancy → Submit Report
```

### Flow 3: Inventory Clerk Daily Workflow
```
Login → Stock Count Screen → Tap + / − per product
  → System Auto-calculates Missing → Save Count → Alerts sent to Owner
```

### Flow 4: Owner Morning Review
```
Login → Dashboard → See Yesterday Summary
  → Tap Alerts → Review Loss Report
  → Check Staff Performance → Export to Telegram
```

## Navigation Architecture

### Mobile (Primary)
```
Bottom Navigation Bar (5 tabs):
  Home | Stock | Sale | Reports | Settings
```

### Tablet / Desktop (Secondary)
```
Left Sidebar Navigation (collapsible):
  Dashboard | Inventory | Sales | Reports | Staff | Settings
```

## Role-Based Navigation
| Screen | Owner | Manager | Cashier | Inventory Clerk |
|---|---|---|---|---|
| Dashboard | Full | Full | Summary only | No |
| Inventory | Full | Full | View only | Full |
| Sales / POS | View | View | Full | No |
| Reports | Full | Full | Own shifts only | No |
| Staff Management | Full | View | No | No |
| Settings | Full | Partial | No | No |
| Product Management | Full | Full | No | No |

---

# 3. DESIGN SYSTEM

## Brand Tokens (`tokens.ts`)

```typescript
export const tokens = {
  colors: {
    berbere: {
      50:  '#fdf0f2',
      100: '#f9cdd3',
      200: '#f49aa7',
      300: '#e8687a',
      400: '#d4394f',
      500: '#8B2635', // PRIMARY
      600: '#7a1f2d',
      700: '#611926',
      800: '#49131d',
      900: '#310d13',
    },
    gold: {
      50:  '#fdf8ee',
      100: '#faecd0',
      200: '#f5d89f',
      300: '#efbe65',
      400: '#E2A03F', // SECONDARY
      500: '#c8852a',
      600: '#a86b20',
      700: '#865218',
      800: '#633b10',
      900: '#42250a',
    },
    cream: {
      50:  '#fdfcf8',
      100: '#F7F4EB', // BACKGROUND
      200: '#ede9db',
      300: '#ddd8c8',
      400: '#ccc5b0',
    },
    coffee: {
      50:  '#f5f0ef',
      100: '#ddd0ce',
      200: '#bba09c',
      300: '#9b7b74',
      400: '#7a5a54',
      500: '#5a3e38',
      600: '#3f2a24',
      700: '#2B1E1A', // TEXT PRIMARY
      800: '#1a110e',
      900: '#0d0807',
    },
    semantic: {
      success: '#1e7e4a',
      successBg: '#e8f5ee',
      warning: '#c47a00',
      warningBg: '#fff8e6',
      danger: '#c0392b',
      dangerBg: '#fdecea',
      info: '#1565c0',
      infoBg: '#e3f0fc',
    }
  },

  typography: {
    // Primary: DM Sans (Latin)
    // Ethiopian: Noto Sans Ethiopic
    // Display: Playfair Display (brand moments only)
    fontFamily: {
      sans: '"DM Sans", "Noto Sans Ethiopic", system-ui, sans-serif',
      display: '"Playfair Display", serif',
      mono: '"JetBrains Mono", monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      md: '16px',
      lg: '18px',
      xl: '22px',
      '2xl': '26px',
      '3xl': '32px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    }
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  shadows: {
    card: '0 1px 3px rgba(43,30,26,0.08), 0 1px 2px rgba(43,30,26,0.04)',
    elevated: '0 4px 16px rgba(43,30,26,0.10)',
    modal: '0 20px 60px rgba(43,30,26,0.18)',
  },

  touchTargets: {
    minimum: '44px',   // WCAG minimum
    comfortable: '52px', // recommended for POS
    large: '64px',     // primary actions
  },

  breakpoints: {
    sm: '390px',   // small Android
    md: '430px',   // large Android / iPhone Pro Max
    lg: '768px',   // tablet
    xl: '1024px',  // desktop
  }
}
```

## Tailwind Config (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss'
import { tokens } from './src/design/tokens'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        berbere: tokens.colors.berbere,
        gold: tokens.colors.gold,
        cream: tokens.colors.cream,
        coffee: tokens.colors.coffee,
      },
      fontFamily: tokens.typography.fontFamily,
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

---

# 4. FOLDER STRUCTURE

```
liyu-pos/
├── public/
│   ├── icons/               # PWA icons (72,96,128,144,152,192,384,512)
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service Worker (auto-generated by next-pwa)
│   └── fonts/               # Self-hosted fonts for offline
│
├── src/
│   ├── app/                 # Next.js 15 App Router
│   │   ├── [locale]/        # next-intl locale wrapper
│   │   │   ├── (auth)/      # Auth route group (no shell)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (app)/       # Authenticated route group (with shell)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [productId]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── sales/
│   │   │   │   │   ├── page.tsx          # POS screen
│   │   │   │   │   └── [saleId]/
│   │   │   │   │       └── page.tsx      # Receipt
│   │   │   │   ├── reports/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── daily/page.tsx
│   │   │   │   │   ├── weekly/page.tsx
│   │   │   │   │   └── monthly/page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── new/page.tsx
│   │   │   │   ├── shifts/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── close/page.tsx
│   │   │   │   ├── staff/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx            # AppShell wrapper
│   │   │   │
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx              # Business setup wizard
│   │   │   │
│   │   │   └── layout.tsx                # Locale layout + providers
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── sync/route.ts             # Offline sync endpoint
│   │   │   └── reports/export/route.ts
│   │   │
│   │   └── layout.tsx                    # Root layout
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── SafeAreaWrapper.tsx
│   │   │
│   │   ├── ui/                           # Shadcn + custom
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Sheet.tsx                 # Bottom sheet
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── pos/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   ├── PaymentSelector.tsx
│   │   │   ├── NumericKeypad.tsx
│   │   │   └── ReceiptCard.tsx
│   │   │
│   │   ├── inventory/
│   │   │   ├── InventoryCounter.tsx
│   │   │   ├── StockRow.tsx
│   │   │   ├── DiscrepancyAlert.tsx
│   │   │   └── CategoryFilter.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── StatCard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── TopProductsChart.tsx
│   │   │   ├── PaymentBreakdown.tsx
│   │   │   ├── ShiftSummaryCard.tsx
│   │   │   └── LossAuditCard.tsx
│   │   │
│   │   ├── shifts/
│   │   │   ├── ShiftOpenForm.tsx
│   │   │   ├── ShiftCloseForm.tsx
│   │   │   └── ShiftStatusBar.tsx
│   │   │
│   │   └── shared/
│   │       ├── LanguageSwitcher.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingState.tsx
│   │       ├── OfflineBanner.tsx
│   │       ├── SyncStatusIndicator.tsx
│   │       ├── RoleGuard.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── design/
│   │   ├── tokens.ts
│   │   └── globals.css
│   │
│   ├── hooks/
│   │   ├── useOnlineStatus.ts
│   │   ├── useSyncQueue.ts
│   │   ├── useShift.ts
│   │   ├── useCart.ts
│   │   ├── usePermissions.ts
│   │   ├── useReports.ts
│   │   └── useProducts.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   ├── server.ts              # Server client
│   │   │   └── middleware.ts
│   │   ├── offline/
│   │   │   ├── db.ts                  # IndexedDB via idb
│   │   │   ├── syncQueue.ts
│   │   │   ├── conflictResolver.ts
│   │   │   └── syncEngine.ts
│   │   ├── calculations/
│   │   │   ├── profit.ts
│   │   │   ├── discrepancy.ts
│   │   │   └── reports.ts
│   │   └── utils/
│   │       ├── currency.ts            # ETB formatting
│   │       ├── date.ts
│   │       └── validation.ts
│   │
│   ├── stores/                        # Zustand stores
│   │   ├── authStore.ts
│   │   ├── productStore.ts
│   │   ├── inventoryStore.ts
│   │   ├── cartStore.ts
│   │   ├── shiftStore.ts
│   │   ├── reportStore.ts
│   │   └── uiStore.ts
│   │
│   ├── queries/                       # React Query hooks
│   │   ├── useProductsQuery.ts
│   │   ├── useSalesQuery.ts
│   │   ├── useInventoryQuery.ts
│   │   ├── useShiftsQuery.ts
│   │   └── useReportsQuery.ts
│   │
│   ├── types/
│   │   ├── database.ts                # Supabase generated types
│   │   ├── pos.ts
│   │   ├── inventory.ts
│   │   ├── reports.ts
│   │   ├── shifts.ts
│   │   └── permissions.ts
│   │
│   ├── i18n/
│   │   ├── routing.ts
│   │   ├── navigation.ts
│   │   └── messages/
│   │       ├── en.json
│   │       └── am.json
│   │
│   └── middleware.ts                  # next-intl + auth middleware
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_functions.sql
│   │   └── 004_seed.sql
│   ├── functions/
│   │   ├── shift-close/index.ts
│   │   ├── sync-batch/index.ts
│   │   └── send-report/index.ts
│   └── config.toml
│
├── next.config.ts
├── middleware.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

# 5. DATABASE SCHEMA (PostgreSQL / Supabase)

```sql
-- ============================================
-- LIYU POS — COMPLETE DATABASE SCHEMA v1.0
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. BUSINESSES
-- ============================================
CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('bar','restaurant','cafe','hotel','retail','other')),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  city            VARCHAR(100) DEFAULT 'Addis Ababa',
  logo_url        TEXT,
  currency        VARCHAR(10) DEFAULT 'ETB',
  timezone        VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
  language        VARCHAR(10) DEFAULT 'am',
  tax_rate        NUMERIC(5,2) DEFAULT 0.00,
  is_active       BOOLEAN DEFAULT TRUE,
  plan            VARCHAR(20) DEFAULT 'starter'
                    CHECK (plan IN ('starter','business','pro')),
  trial_ends_at   TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_businesses_active ON businesses(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- 2. BRANCHES
-- ============================================
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  phone           VARCHAR(20),
  is_main         BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_branches_business ON branches(business_id) WHERE deleted_at IS NULL;

-- ============================================
-- 3. USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id),
  branch_id       UUID REFERENCES branches(id),
  full_name       VARCHAR(150) NOT NULL,
  phone           VARCHAR(20),
  pin_hash        TEXT,              -- 4-digit PIN for quick login on shared devices
  role            VARCHAR(30) NOT NULL
                    CHECK (role IN ('owner','manager','cashier','inventory_clerk')),
  language        VARCHAR(10) DEFAULT 'am',
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_seen_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_business ON profiles(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(business_id, role);

-- ============================================
-- 4. CATEGORIES
-- ============================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  name_am         VARCHAR(100),    -- Amharic name
  icon            VARCHAR(50),     -- emoji or icon name
  color           VARCHAR(20),
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_categories_business ON categories(business_id) WHERE deleted_at IS NULL;

-- ============================================
-- 5. PRODUCTS
-- ============================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),
  category_id     UUID REFERENCES categories(id),
  name            VARCHAR(200) NOT NULL,
  name_am         VARCHAR(200),
  barcode         VARCHAR(100),
  sku             VARCHAR(100),
  unit_type       VARCHAR(30) DEFAULT 'piece'
                    CHECK (unit_type IN ('piece','bottle','crate','kg','gram','liter','ml','pack')),
  units_per_crate INT DEFAULT 1,   -- e.g. 24 bottles per crate
  cost_price      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  retail_price    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_inclusive   BOOLEAN DEFAULT TRUE,
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_sold_by_weight BOOLEAN DEFAULT FALSE,
  track_inventory BOOLEAN DEFAULT TRUE,
  low_stock_alert INT DEFAULT 5,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE,

  CONSTRAINT positive_prices CHECK (cost_price >= 0 AND retail_price >= 0)
);

CREATE INDEX idx_products_business ON products(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- ============================================
-- 6. SUPPLIERS
-- ============================================
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 7. INVENTORY (current stock levels)
-- ============================================
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(branch_id, product_id)
);

CREATE INDEX idx_inventory_branch_product ON inventory(branch_id, product_id);
CREATE INDEX idx_inventory_low ON inventory(business_id, quantity);

-- ============================================
-- 8. STOCK RECONCILIATION (daily count records)
-- ============================================
CREATE TABLE stock_reconciliations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  shift_id            UUID,             -- linked after shifts table
  product_id          UUID NOT NULL REFERENCES products(id),
  counted_by          UUID REFERENCES profiles(id),
  recon_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  added_qty           NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_qty         NUMERIC(10,2) NOT NULL DEFAULT 0,
  logged_sales_qty    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discrepancy_qty     NUMERIC(10,2) GENERATED ALWAYS AS
                        ((opening_qty + added_qty - closing_qty) - logged_sales_qty) STORED,
  discrepancy_value   NUMERIC(10,2),     -- computed by trigger
  notes               TEXT,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(branch_id, product_id, recon_date, shift_id)
);

CREATE INDEX idx_recon_date ON stock_reconciliations(branch_id, recon_date);
CREATE INDEX idx_recon_discrepancy ON stock_reconciliations(business_id, discrepancy_qty)
  WHERE discrepancy_qty != 0;

-- ============================================
-- 9. INVENTORY MOVEMENTS (full audit trail)
-- ============================================
CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  user_id         UUID REFERENCES profiles(id),
  movement_type   VARCHAR(30) NOT NULL
                    CHECK (movement_type IN (
                      'sale','purchase','adjustment','transfer_in',
                      'transfer_out','waste','theft','return','opening'
                    )),
  quantity        NUMERIC(10,2) NOT NULL,   -- negative = reduction
  unit_cost       NUMERIC(10,2),
  reference_id    UUID,                      -- sale_id or purchase_id
  reference_type  VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON inventory_movements(branch_id, product_id, created_at DESC);
CREATE INDEX idx_movements_type ON inventory_movements(business_id, movement_type, created_at DESC);

-- ============================================
-- 10. PURCHASES (stock received from suppliers)
-- ============================================
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  supplier_id     UUID REFERENCES suppliers(id),
  created_by      UUID REFERENCES profiles(id),
  reference_no    VARCHAR(100),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid_amount     NUMERIC(10,2) DEFAULT 0.00,
  status          VARCHAR(20) DEFAULT 'received'
                    CHECK (status IN ('pending','received','partial')),
  notes           TEXT,
  purchased_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2) NOT NULL,
  total_cost      NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- ============================================
-- 11. SHIFTS
-- ============================================
CREATE TABLE shifts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id),
  branch_id             UUID NOT NULL REFERENCES branches(id),
  cashier_id            UUID NOT NULL REFERENCES profiles(id),
  opened_by             UUID REFERENCES profiles(id),
  closed_by             UUID REFERENCES profiles(id),
  shift_label           VARCHAR(30) DEFAULT 'Morning'
                          CHECK (shift_label IN ('Morning','Afternoon','Evening','Night','Full Day')),
  opened_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at             TIMESTAMP WITH TIME ZONE,
  opening_cash          NUMERIC(10,2) DEFAULT 0.00,
  expected_cash         NUMERIC(10,2) DEFAULT 0.00,   -- computed at close
  actual_cash_reported  NUMERIC(10,2),
  cash_discrepancy      NUMERIC(10,2)
                          GENERATED ALWAYS AS (actual_cash_reported - expected_cash) STORED,
  total_sales           NUMERIC(10,2) DEFAULT 0.00,
  total_transactions    INT DEFAULT 0,
  status                VARCHAR(20) DEFAULT 'open'
                          CHECK (status IN ('open','closed','suspended')),
  notes                 TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shifts_branch ON shifts(branch_id, opened_at DESC);
CREATE INDEX idx_shifts_cashier ON shifts(cashier_id, opened_at DESC);
CREATE INDEX idx_shifts_open ON shifts(branch_id, status) WHERE status = 'open';

-- Add FK now that shifts table exists
ALTER TABLE stock_reconciliations
  ADD CONSTRAINT fk_recon_shift FOREIGN KEY (shift_id) REFERENCES shifts(id);

-- ============================================
-- 12. SALES (receipts / transactions)
-- ============================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  shift_id        UUID REFERENCES shifts(id),
  cashier_id      UUID REFERENCES profiles(id),
  receipt_number  VARCHAR(50) NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount      NUMERIC(10,2) DEFAULT 0.00,
  discount_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status          VARCHAR(20) DEFAULT 'completed'
                    CHECK (status IN ('completed','voided','refunded','pending')),
  customer_name   VARCHAR(150),
  customer_phone  VARCHAR(20),
  notes           TEXT,
  is_offline_sync BOOLEAN DEFAULT FALSE,   -- was created offline
  offline_id      VARCHAR(100),            -- local UUID before sync
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  voided_at       TIMESTAMP WITH TIME ZONE,
  voided_by       UUID REFERENCES profiles(id),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sales_shift ON sales(shift_id);
CREATE INDEX idx_sales_date ON sales(business_id, created_at DESC);
CREATE INDEX idx_sales_cashier ON sales(cashier_id, created_at DESC);
CREATE UNIQUE INDEX idx_sales_receipt ON sales(business_id, receipt_number);
CREATE INDEX idx_sales_offline ON sales(offline_id) WHERE offline_id IS NOT NULL;

-- ============================================
-- 13. SALE ITEMS (line items per receipt)
-- ============================================
CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200) NOT NULL,   -- snapshot at time of sale
  unit_price      NUMERIC(10,2) NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,  -- snapshot for profit tracking
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  discount        NUMERIC(10,2) DEFAULT 0.00,
  total_amount    NUMERIC(10,2) GENERATED ALWAYS AS
                    ((unit_price - discount) * quantity) STORED,
  gross_profit    NUMERIC(10,2) GENERATED ALWAYS AS
                    ((unit_price - cost_price - discount) * quantity) STORED,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id, created_at DESC);

-- ============================================
-- 14. PAYMENTS (per sale, supports split payment)
-- ============================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id),
  method          VARCHAR(40) NOT NULL
                    CHECK (method IN (
                      'cash','telebirr','cbe_birr','coop_bank',
                      'awash_bank','dashen_bank','bank_transfer','credit'
                    )),
  amount          NUMERIC(10,2) NOT NULL,
  reference_no    VARCHAR(100),          -- Telebirr/CBE transaction ref
  status          VARCHAR(20) DEFAULT 'completed'
                    CHECK (status IN ('completed','pending','failed','refunded')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(business_id, method, created_at DESC);

-- ============================================
-- 15. EXPENSES
-- ============================================
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID REFERENCES branches(id),
  recorded_by     UUID REFERENCES profiles(id),
  shift_id        UUID REFERENCES shifts(id),
  category        VARCHAR(80) NOT NULL,
  description     TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  VARCHAR(40) DEFAULT 'cash',
  receipt_url     TEXT,
  expense_date    DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_expenses_date ON expenses(business_id, expense_date DESC);

-- ============================================
-- 16. AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id),
  user_id         UUID REFERENCES profiles(id),
  action          VARCHAR(100) NOT NULL,
  table_name      VARCHAR(80),
  record_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_business ON audit_logs(business_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);

-- ============================================
-- 17. USEFUL DATABASE FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Compute discrepancy_value on reconciliation insert/update
CREATE OR REPLACE FUNCTION compute_discrepancy_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.discrepancy_value = NEW.discrepancy_qty *
    (SELECT retail_price FROM products WHERE id = NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recon_discrepancy
  BEFORE INSERT OR UPDATE ON stock_reconciliations
  FOR EACH ROW EXECUTE FUNCTION compute_discrepancy_value();

-- Update inventory after a sale item insert
CREATE OR REPLACE FUNCTION reduce_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
    SET quantity = quantity - NEW.quantity,
        updated_at = NOW()
  WHERE product_id = NEW.product_id
    AND branch_id = (
      SELECT branch_id FROM sales WHERE id = NEW.sale_id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_item_inventory
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION reduce_inventory_on_sale();

-- Generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(business_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  seq INT;
  prefix TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
    FROM sales WHERE business_id = business_uuid;
  prefix := TO_CHAR(NOW(), 'YYMMDD');
  RETURN 'LIY-' || prefix || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

---

# 6. SUPABASE SECURITY (RLS + AUTH)

## Auth Strategy
- **Primary**: Supabase Auth (email + password)
- **OTP**: Phone number via Africa's Talking SMS (Ethiopian numbers)
- **PIN Login**: 4-digit PIN stored as bcrypt hash for shared-device cashier login
- **Session**: Persist in localStorage + SecureStore (React Native future)

## Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get calling user's business_id
CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get calling user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- BUSINESSES: Only owner can manage their own business
CREATE POLICY "business_owner_select" ON businesses
  FOR SELECT USING (id = auth_business_id());

CREATE POLICY "business_owner_update" ON businesses
  FOR UPDATE USING (id = auth_business_id() AND auth_role() = 'owner');

-- PROFILES: Users see only their own business staff
CREATE POLICY "profiles_business_select" ON profiles
  FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_owner_manage" ON profiles
  FOR ALL USING (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager')
  );

-- PRODUCTS: All staff can view; only owner/manager can modify
CREATE POLICY "products_view" ON products
  FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "products_manage" ON products
  FOR INSERT WITH CHECK (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager')
  );

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager')
  );

-- SALES: Cashier can create; all staff can view own business
CREATE POLICY "sales_view" ON sales
  FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "sales_create" ON sales
  FOR INSERT WITH CHECK (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager','cashier')
  );

-- SALES void: only owner/manager
CREATE POLICY "sales_void" ON sales
  FOR UPDATE USING (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager')
  );

-- SHIFTS: Cashier manages own shifts; owner/manager sees all
CREATE POLICY "shifts_view_own" ON shifts
  FOR SELECT USING (
    business_id = auth_business_id() AND (
      auth_role() IN ('owner','manager') OR
      cashier_id = auth.uid()
    )
  );

CREATE POLICY "shifts_create" ON shifts
  FOR INSERT WITH CHECK (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager','cashier')
  );

-- INVENTORY: Clerk and above can view; clerk can update stock counts
CREATE POLICY "inventory_view" ON inventory
  FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "inventory_update" ON inventory
  FOR UPDATE USING (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager','inventory_clerk')
  );

-- AUDIT LOGS: Read-only for owner/manager
CREATE POLICY "audit_view" ON audit_logs
  FOR SELECT USING (
    business_id = auth_business_id() AND
    auth_role() IN ('owner','manager')
  );
```

## Supabase Storage Strategy
```
Bucket: liyu-assets
├── logos/{business_id}/logo.{ext}          -- Business logos
├── products/{business_id}/{product_id}.{ext} -- Product images
├── receipts/{business_id}/{year}/{month}/  -- Receipt PDFs
└── avatars/{user_id}/avatar.{ext}          -- Staff avatars

Storage Policies:
- Public read for logos and product images
- Auth-only write to own business bucket
- Signed URLs for receipts (expire 1 hour)
```

---

# 7. ZUSTAND STATE MANAGEMENT

## Auth Store (`stores/authStore.ts`)
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Business } from '@/types'

interface AuthState {
  user: Profile | null
  business: Business | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: Profile | null) => void
  setBusiness: (business: Business | null) => void
  logout: () => void
  hasPermission: (action: Permission) => boolean
}

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['all'],
  manager: ['view_reports','manage_products','manage_staff',
             'process_sales','manage_inventory','close_shifts'],
  cashier: ['process_sales','view_own_shifts','view_products'],
  inventory_clerk: ['manage_inventory','view_products'],
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setBusiness: (business) => set({ business }),
      logout: () => set({ user: null, business: null, isAuthenticated: false }),
      hasPermission: (action) => {
        const { user } = get()
        if (!user) return false
        const perms = ROLE_PERMISSIONS[user.role] || []
        return perms.includes('all') || perms.includes(action)
      },
    }),
    { name: 'liyu-auth' }
  )
)
```

## Cart Store (`stores/cartStore.ts`)
```typescript
import { create } from 'zustand'
import type { Product, CartItem, PaymentMethod } from '@/types'

interface CartState {
  items: CartItem[]
  paymentMethod: PaymentMethod
  note: string
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setPaymentMethod: (method: PaymentMethod) => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  paymentMethod: 'cash',
  note: '',
  addItem: (product) => {
    const { items } = get()
    const existing = items.find(i => i.product.id === product.id)
    if (existing) {
      set({ items: items.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )})
    } else {
      set({ items: [...items, { product, quantity: 1 }] })
    }
  },
  removeItem: (productId) =>
    set({ items: get().items.filter(i => i.product.id !== productId) }),
  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return }
    set({ items: get().items.map(i =>
      i.product.id === productId ? { ...i, quantity: qty } : i
    )})
  },
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  clearCart: () => set({ items: [], note: '' }),
  subtotal: () => get().items.reduce(
    (sum, i) => sum + i.product.retail_price * i.quantity, 0
  ),
  total: () => get().subtotal(),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
```

## Shift Store (`stores/shiftStore.ts`)
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Shift } from '@/types'

interface ShiftState {
  currentShift: Shift | null
  isShiftOpen: boolean
  openShift: (shift: Shift) => void
  closeShift: () => void
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      currentShift: null,
      isShiftOpen: false,
      openShift: (shift) => set({ currentShift: shift, isShiftOpen: true }),
      closeShift: () => set({ currentShift: null, isShiftOpen: false }),
    }),
    { name: 'liyu-shift' }
  )
)
```

---

# 8. OFFLINE-FIRST ARCHITECTURE

## IndexedDB Schema (`lib/offline/db.ts`)
```typescript
import { openDB, DBSchema } from 'idb'

interface LiyuDB extends DBSchema {
  products: {
    key: string
    value: Product
    indexes: { 'by-category': string; 'by-business': string }
  }
  pending_sales: {
    key: string
    value: PendingSale & {
      localId: string
      createdAt: number
      retryCount: number
    }
  }
  pending_stock: {
    key: string
    value: StockCount & { localId: string; createdAt: number }
  }
  sync_log: {
    key: string
    value: { id: string; type: string; status: string; timestamp: number }
  }
}

export const getDB = () => openDB<LiyuDB>('liyu-pos', 1, {
  upgrade(db) {
    const products = db.createObjectStore('products', { keyPath: 'id' })
    products.createIndex('by-category', 'category_id')
    products.createIndex('by-business', 'business_id')
    db.createObjectStore('pending_sales', { keyPath: 'localId' })
    db.createObjectStore('pending_stock', { keyPath: 'localId' })
    db.createObjectStore('sync_log', { keyPath: 'id' })
  }
})
```

## Sync Engine (`lib/offline/syncEngine.ts`)
```typescript
export class SyncEngine {
  private isSyncing = false

  async syncAll() {
    if (this.isSyncing || !navigator.onLine) return
    this.isSyncing = true

    try {
      await this.syncPendingSales()
      await this.syncPendingStockCounts()
      await this.pullLatestProducts()
    } finally {
      this.isSyncing = false
    }
  }

  private async syncPendingSales() {
    const db = await getDB()
    const pending = await db.getAll('pending_sales')
    // Sort by createdAt ascending — preserve order
    const sorted = pending.sort((a, b) => a.createdAt - b.createdAt)

    for (const sale of sorted) {
      try {
        const response = await fetch('/api/sync/sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale),
        })
        if (response.ok) {
          await db.delete('pending_sales', sale.localId)
        }
      } catch {
        // Increment retry count, leave in queue
        await db.put('pending_sales', { ...sale, retryCount: sale.retryCount + 1 })
      }
    }
  }

  // ... syncPendingStockCounts, pullLatestProducts
}

// Conflict resolution strategy:
// Last-Write-Wins for stock counts (server timestamp wins)
// Append-Only for sales (all offline sales accepted, server assigns final ID)
// Products pulled fresh from server, local cache is read-only for product data
```

## useOnlineStatus Hook (`hooks/useOnlineStatus.ts`)
```typescript
'use client'
import { useEffect, useState } from 'react'
import { SyncEngine } from '@/lib/offline/syncEngine'

const syncEngine = new SyncEngine()

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true)
      await syncEngine.syncAll()
    }
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Also poll every 30s when online to catch missed syncs
    const interval = setInterval(() => {
      if (navigator.onLine) syncEngine.syncAll()
    }, 30_000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, pendingCount }
}
```

---

# 9. INTERNATIONALIZATION

## Translation Files

### English (`i18n/messages/en.json`)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "offline": "You are offline",
    "sync_pending": "{count} items pending sync",
    "etb": "ETB",
    "confirm": "Confirm",
    "back": "Back"
  },
  "nav": {
    "home": "Home",
    "stock": "Stock",
    "sales": "Sales",
    "reports": "Reports",
    "settings": "Settings"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "phone": "Phone Number",
    "password": "Password",
    "pin": "Enter PIN",
    "register": "Create Account",
    "forgot_password": "Forgot Password?"
  },
  "dashboard": {
    "today_revenue": "Today's Revenue",
    "net_profit": "Net Profit",
    "items_sold": "Items Sold",
    "missing_loss": "Missing / Loss",
    "top_selling": "Top Selling Today",
    "alerts": "Alerts",
    "shift_open": "Shift Open",
    "shift_closed": "No Open Shift"
  },
  "inventory": {
    "stock_count": "Stock Count",
    "tap_to_count": "Tap + or − to count",
    "opening": "Opening",
    "closing": "Closing",
    "added": "Added",
    "sold": "Sold",
    "missing": "Missing",
    "save_count": "Save Stock Count",
    "count_saved": "Stock count saved"
  },
  "sales": {
    "record_sale": "Record Sale",
    "select_items": "Select items to add",
    "payment_method": "Payment Method",
    "cash": "Cash",
    "telebirr": "Telebirr",
    "cbe_birr": "CBE Birr",
    "total": "Total",
    "confirm_sale": "Confirm Sale",
    "sale_recorded": "Sale recorded successfully",
    "empty_cart": "Please add at least one item"
  },
  "shifts": {
    "open_shift": "Open Shift",
    "close_shift": "Close Shift",
    "opening_cash": "Opening Cash",
    "closing_cash": "Actual Cash in Drawer",
    "expected_cash": "System expects",
    "difference": "Difference",
    "cashier": "Cashier",
    "duration": "Duration",
    "submit_close": "Close Shift & Submit",
    "notes": "Notes for owner"
  },
  "reports": {
    "title": "Reports",
    "revenue": "Revenue",
    "cost": "Cost of Goods",
    "loss": "Loss / Missing",
    "profit": "Net Profit",
    "payment_breakdown": "Payment Breakdown",
    "loss_audit": "Loss Audit",
    "send_telegram": "Send Report via Telegram"
  },
  "products": {
    "add_product": "Add Product",
    "product_name": "Product Name",
    "category": "Category",
    "cost_price": "Cost Price",
    "sell_price": "Sell Price",
    "unit_type": "Unit Type",
    "low_stock_alert": "Low Stock Alert"
  }
}
```

### Amharic (`i18n/messages/am.json`)
```json
{
  "common": {
    "save": "አስቀምጥ",
    "cancel": "ሰርዝ",
    "delete": "ሰርዝ",
    "edit": "አርትዕ",
    "loading": "በመጫን ላይ...",
    "offline": "ኢንተርኔት የለም",
    "sync_pending": "{count} ዕቃዎች ሳይሰሙ ቀርተዋል",
    "etb": "ብር",
    "confirm": "አረጋግጥ",
    "back": "ተመለስ"
  },
  "nav": {
    "home": "መነሻ",
    "stock": "ክምችት",
    "sales": "ሽያጭ",
    "reports": "ሪፖርት",
    "settings": "ቅንብሮች"
  },
  "auth": {
    "login": "ግባ",
    "logout": "ውጣ",
    "phone": "ስልክ ቁጥር",
    "password": "የሚስጥር ቃል",
    "pin": "PIN አስገባ",
    "register": "ሂሳብ ፍጠር",
    "forgot_password": "የሚስጥር ቃሉን ረሳህ?"
  },
  "dashboard": {
    "today_revenue": "የዛሬ ገቢ",
    "net_profit": "ትርፍ",
    "items_sold": "የተሸጡ ዕቃዎች",
    "missing_loss": "የጠፋ / ኪሳራ",
    "top_selling": "ዛሬ በብዛት የተሸጡ",
    "alerts": "ማስጠንቀቂያዎች",
    "shift_open": "ሺፍት ክፍት ነው",
    "shift_closed": "ክፍት ሺፍት የለም"
  },
  "inventory": {
    "stock_count": "ክምችት ቆጠራ",
    "tap_to_count": "ለመቁጠር + ወይም − 누르ï¸",
    "opening": "መክፈቻ",
    "closing": "መዝጊያ",
    "added": "የተጨመረ",
    "sold": "የተሸጠ",
    "missing": "የጠፋ",
    "save_count": "ቆጠራ አስቀምጥ",
    "count_saved": "ቆጠራ ተቀምጧል"
  },
  "sales": {
    "record_sale": "ሽያጭ ያስገቡ",
    "select_items": "ዕቃዎችን ይምረጡ",
    "payment_method": "የክፍያ ዘዴ",
    "cash": "ጥሬ ገንዘብ",
    "telebirr": "ቴሌብር",
    "cbe_birr": "ሲቢኢ ብር",
    "total": "ጠቅላላ",
    "confirm_sale": "ሽያጭ አረጋግጥ",
    "sale_recorded": "ሽያጭ ተመዝግቧል",
    "empty_cart": "እባክዎ ቢያንስ አንድ ዕቃ ያክሉ"
  },
  "shifts": {
    "open_shift": "ሺፍት ክፈት",
    "close_shift": "ሺፍት ዝጋ",
    "opening_cash": "የመክፈቻ ጥሬ ገንዘብ",
    "closing_cash": "ካዝናዎ ውስጥ ያለ ገንዘብ",
    "expected_cash": "ሥርዓቱ የሚጠብቀው",
    "difference": "ልዩነት",
    "cashier": "ካሸር",
    "duration": "ቆይታ",
    "submit_close": "ሺፍት ዝጋ እና አስገባ",
    "notes": "ለባለቤቱ ማስታወሻ"
  },
  "reports": {
    "title": "ሪፖርቶች",
    "revenue": "ገቢ",
    "cost": "የዕቃ ወጪ",
    "loss": "ኪሳራ / ጥፋት",
    "profit": "ትርፍ",
    "payment_breakdown": "የክፍያ ዝርዝር",
    "loss_audit": "የጥፋት ዝርዝር",
    "send_telegram": "ሪፖርት ወደ ቴሌግራም ላክ"
  },
  "products": {
    "add_product": "ዕቃ ጨምር",
    "product_name": "የዕቃ ስም",
    "category": "ምድብ",
    "cost_price": "ዋጋ ግዥ",
    "sell_price": "የሽያጭ ዋጋ",
    "unit_type": "የዕቃ አይነት",
    "low_stock_alert": "ዝቅተኛ ክምችት ማስጠንቀቂያ"
  }
}
```

---

# 10. COMPONENT ARCHITECTURE

## Key Components

### InventoryCounter (`components/inventory/InventoryCounter.tsx`)
```typescript
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  product: Product
  initialCount?: number
  onChange: (productId: string, count: number) => void
}

export function InventoryCounter({ product, initialCount = 0, onChange }: Props) {
  const [count, setCount] = useState(initialCount)
  const t = useTranslations('inventory')

  const change = (delta: number) => {
    const next = Math.max(0, count + delta)
    setCount(next)
    onChange(product.id, next)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-coffee-100">
      <span className="text-2xl">{product.icon || '📦'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-coffee-700 truncate">{product.name}</p>
        <p className="text-xs text-coffee-400">{product.category} · {t('opening')}: {initialCount}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => change(-1)}
          className="w-10 h-10 rounded-full border-2 border-berbere-500
                     text-berbere-500 text-xl font-bold flex items-center justify-center
                     active:bg-berbere-50 touch-manipulation"
          aria-label="decrease"
        >−</button>
        <span className="text-lg font-bold min-w-[28px] text-center tabular-nums">
          {count}
        </span>
        <button
          onClick={() => change(1)}
          className="w-10 h-10 rounded-full bg-berbere-500
                     text-white text-xl font-bold flex items-center justify-center
                     active:bg-berbere-600 touch-manipulation"
          aria-label="increase"
        >+</button>
      </div>
    </div>
  )
}
```

### OfflineBanner (`components/shared/OfflineBanner.tsx`)
```typescript
'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useTranslations } from 'next-intl'

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOnlineStatus()
  const t = useTranslations('common')

  if (isOnline && pendingCount === 0) return null

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium
      ${isOnline ? 'bg-gold-100 text-gold-800' : 'bg-danger-bg text-danger'}`}>
      {isOnline
        ? t('sync_pending', { count: pendingCount })
        : t('offline')}
    </div>
  )
}
```

### RoleGuard (`components/shared/RoleGuard.tsx`)
```typescript
import { useAuthStore } from '@/stores/authStore'
import type { Permission } from '@/types/permissions'

interface Props {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ permission, fallback = null, children }: Props) {
  const hasPermission = useAuthStore(s => s.hasPermission)
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}
```

---

# 11. SCREEN SPECIFICATIONS

## Dashboard Screen
- **Layout**: TopBar (business name + shift badge) → StatGrid (2×2) → AlertList → BarChart → BottomNav
- **Stats shown**: Today Revenue, Net Profit, Items Sold, Missing/Loss
- **Alerts**: Only shown if discrepancies exist — tap to expand
- **Mobile behavior**: Single column, all stats visible without scroll above the fold on 390px screen
- **Role adaptation**: Cashier sees only their shift totals; Owner sees all branches

## POS / Sales Screen
- **Layout**: TopBar with cart total → CategoryPills → ProductGrid → CartSummary → PaymentSelector → ConfirmButton
- **Product cards**: Large tap targets (min 64px height), item name + price + profit per unit
- **Cart**: Floating summary at bottom, updates live
- **Payment**: 3 primary methods shown as icon + label buttons, always visible
- **Confirm**: Full-width red button at bottom — impossible to miss

## Inventory Screen
- **Layout**: TopBar → CategoryPills → CounterList → SaveButton
- **Design principle**: No typing required. Only + and − buttons
- **Discrepancy preview**: Shows live "X missing" calculation as clerk counts
- **Save behavior**: Saves locally first, syncs in background

## Reports Screen
- **Layout**: DateSelector → ProfitSummaryCard → PaymentBreakdown → DiscrepancyList → ExportButton
- **Charts**: Recharts bar chart for top products, simple and fast-rendering
- **Export**: Formats a Telegram-ready text message, copies to clipboard or opens Telegram

## Shift Close Screen
- **Guard**: Cannot navigate away without completing close
- **Expected vs actual**: Large, clear comparison — shown in red if shortfall
- **PIN confirmation**: Cashier re-enters PIN to confirm
- **Submission**: Locks shift, sends report to Owner's Telegram

---

# 12. SECURITY ARCHITECTURE

## Layers of Security
1. **Transport**: HTTPS everywhere, HSTS headers in next.config.ts
2. **Auth**: Supabase JWT, short expiry (1 hour), refresh tokens in HttpOnly cookies
3. **Authorization**: RLS on every table — DB enforces permissions, not just frontend
4. **Input validation**: Zod schemas on every form and API route
5. **Rate limiting**: Vercel Edge middleware — 60 req/min per IP on auth endpoints
6. **Audit trail**: Every mutation logged to audit_logs with user_id + timestamp
7. **PIN security**: bcrypt hashed, never stored in plain text, not transmitted over network

## Sensitive Data Handling
- Prices and financials: stored as NUMERIC(10,2), never as floats
- Employee PINs: bcrypt rounds 12
- Payment references: stored but never logged in plain text audit logs

---

# 13. PERFORMANCE STRATEGY

## For Low-End Android Devices
- **Bundle size**: Target < 200KB initial JS (use dynamic imports aggressively)
- **Images**: WebP with blur placeholder, lazy loaded
- **Fonts**: Self-hosted in /public/fonts — no Google Fonts network call offline
- **Charts**: Only render Recharts on Reports screen (dynamic import)
- **Product list**: Virtualized with react-window when >100 products
- **Supabase queries**: Always paginated, never SELECT *
- **IndexedDB**: Product catalog cached locally — POS works even with no connection

## next.config.ts
```typescript
import withPWA from 'next-pwa'

const nextConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 }
    }
  ]
})({
  experimental: { typedRoutes: true },
  images: { formats: ['image/webp'] },
})

export default nextConfig
```

---

# 14. DEVELOPMENT ROADMAP

## Phase 1 — MVP (Weeks 1–6) — Build Alone
**Goal**: One real bar paying 800 birr/month

| Week | Focus | Deliverable |
|---|---|---|
| 1 | Setup + Auth | Login, register, business setup |
| 2 | Products + Categories | Add/edit products, categories |
| 3 | POS Sales Screen | Record sales, cart, payments |
| 4 | Inventory Counter | Stock count, discrepancy calc |
| 5 | Shifts + Reports | Open/close shift, basic reports |
| 6 | Offline support + PWA | IndexedDB, service worker, install prompt |

## Phase 2 — Growth (Months 2–4) — First 50 Customers
- Telegram Bot report delivery
- Expense tracking
- Employee management
- Purchase recording
- Low stock alerts
- Weekly/monthly reports
- Multi-language polish (Amharic)

## Phase 3 — Scale (Months 5–12) — Revenue Target 150,000 ETB/month
- Multi-branch support
- Telebirr API integration
- Supplier management
- Analytics dashboard
- Customer credit tracking (hutsa)
- Subscription billing
- iOS/Android native shell (Capacitor)

## Phase 4 — Enterprise (Year 2)
- API for third-party integrations
- ETR (Electronic Tax Register) compliance
- Payroll module
- Franchise/chain management
- White-label for distributors

---

*Document prepared for Liyu POS v1.0 — Confidential*
*Architecture designed for Ethiopian market realities: offline-first, mobile-first, Amharic-first.*
