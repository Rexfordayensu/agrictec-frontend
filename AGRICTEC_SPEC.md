# Build Prompt — AgriCtec Frontend (Next.js App Router)

> Copy everything below this line into your AI coding tool.

---

## 1. Role & Goal

You are a senior frontend engineer. Rebuild **AgriCtec** as a production-quality **Next.js frontend**. The existing version is one large `index.html` file with inline CSS and JavaScript. AgriCtec is a mobile-first agritech web app for smallholder farmers in Ghana. Farmers use it to record farm activity, income, expenses and Mobile Money (MoMo) transactions. From those records the app builds a **digital financial identity**: a credit score, loan readiness, and reports that farmers can share with banks and microfinance institutions.

**Scope: frontend only.** Do not build an API, database, or server logic. All data goes through a **service layer** that, for now, saves to `localStorage`. Each service function must be `async` and typed so that it can later be swapped for real API calls without changing any components.

---

## 2. Tech Stack (use exactly this)

- **Next.js 16** (latest 16.x), App Router, **React 19.2**, **TypeScript** (strict mode, 5.1+)
- **Node.js 20.9 or higher** (Node 18 is not supported by Next.js 16)
- Create the project with `npx create-next-app@latest agrictec --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"`
- **Turbopack** is the default bundler for both `next dev` and `next build`. Do not add webpack config.
- Turn on the **React Compiler** (`reactCompiler: true` in `next.config.ts`, plus `babel-plugin-react-compiler`). Because it memoizes automatically, don't add `useMemo`/`useCallback` by hand unless a profiler shows a need.
- **Next.js 16 rules to follow:**
  - Use `proxy.ts` (exporting a `proxy` function), **not** `middleware.ts`, which is deprecated in 16.
  - `params`, `searchParams`, `cookies()` and `headers()` are **async** — always `await` them.
  - Parallel route slots need an explicit `default.tsx`, if you use any.
  - Leave `cacheComponents` off. This is a client-side, localStorage app, so there is nothing to cache on the server.
- **No `src/` folder.** `app/` sits at the project root.
- **Tailwind CSS v4**, with design tokens defined as CSS variables in `app/globals.css`
- **Zustand** for in-memory client state. Data is saved by `services/` (localStorage), not by Zustand `persist`.
- **react-hook-form** + **zod** for every form
- **Chart.js** through **react-chartjs-2** for charts
- **lucide-react** for icons (replaces Font Awesome)
- **next-themes** for dark/light mode, with no flash on load
- **next/font** for fonts: Inter (body) and Playfair Display (headings)
- **sonner** for toast notifications
- **date-fns** for dates
- **jsPDF** + **jspdf-autotable** for real PDF report downloads
- **clsx** + **tailwind-merge**, combined in a `cn()` helper

---

## 3. Folder Structure (required)

Keep the structure flat and organized by feature, so that every page maps to one predictable components folder.

```
agrictec/
├── app/
│   ├── layout.tsx                  # Root: fonts, ThemeProvider, Toaster, metadata
│   ├── globals.css                 # Tailwind + design tokens (dark & light)
│   ├── page.tsx                    # Redirects to /dashboard (or /login if no session)
│   ├── not-found.tsx
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered glass card on the shared page background
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (onboarding)/
│   │   ├── layout.tsx              # Brand, sign-out, one centred card (max 640px)
│   │   └── onboarding/page.tsx     # The six-step farm setup wizard
│   └── (main)/
│       ├── layout.tsx              # Sidebar + Topbar shell, auth guard
│       ├── loading.tsx             # Skeleton
│       ├── dashboard/page.tsx
│       ├── records/page.tsx
│       ├── momo/page.tsx
│       ├── reports/page.tsx
│       ├── assistant/page.tsx      # AI Assistant (chat)
│       ├── crop-doctor/page.tsx
│       ├── yield-predictor/page.tsx
│       ├── loans/page.tsx
│       ├── market/page.tsx         # Market & Weather
│       ├── profile/page.tsx
│       └── settings/page.tsx
│
├── components/
│   ├── ui/                         # Reusable primitives (no business logic)
│   │   ├── button.tsx  card.tsx  input.tsx  select.tsx  textarea.tsx
│   │   ├── modal.tsx  badge.tsx  tabs.tsx  switch.tsx  progress.tsx
│   │   ├── score-ring.tsx  stat-card.tsx  empty-state.tsx  skeleton.tsx
│   │   ├── ai-banner.tsx  ai-chip.tsx  insight-item.tsx  confirm-dialog.tsx
│   │   └── data-table.tsx
│   ├── layout/
│   │   ├── sidebar.tsx  sidebar-nav.tsx  topbar.tsx
│   │   ├── mobile-nav-overlay.tsx  theme-toggle.tsx  global-search.tsx
│   │   └── page-background.tsx     # The one static page background (root layout)
│   ├── charts/
│   │   ├── line-chart.tsx  bar-chart.tsx  doughnut-chart.tsx
│   │   └── use-chart-theme.ts      # Chart colors that follow the theme
│   ├── dashboard/                  # One folder per page
│   ├── records/
│   ├── momo/
│   ├── reports/
│   ├── assistant/
│   ├── crop-doctor/
│   ├── yield-predictor/
│   ├── loans/
│   ├── market/
│   ├── profile/
│   ├── settings/
│   ├── auth/
│   └── onboarding/
│       ├── onboarding-wizard.tsx  step-progress.tsx  wizard-nav.tsx  radio-cards.tsx
│       ├── step-farm-name.tsx  step-location.tsx  farm-map.tsx (client only)
│       ├── step-farm-size.tsx  step-crops.tsx  step-farm-type.tsx
│       ├── step-ghana-card.tsx  step-review.tsx
│       └── onboarding-schemas.ts   # One zod schema per step + the full profile check
│
├── lib/
│   ├── utils.ts                    # cn(), generateId()
│   ├── format.ts                   # formatGHS(), formatDate(), formatGPS()
│   ├── calculations/
│   │   ├── finance.ts              # totals, profit, margin, monthly series
│   │   ├── credit-score.ts         # THE single credit score function
│   │   ├── loan.ts                 # eligibility, amortized repayment
│   │   └── yield.ts                # yield prediction
│   ├── ai/
│   │   ├── assistant-replies.ts    # rule-based chat responses (mock)
│   │   ├── crop-diagnosis.ts       # mock diagnosis
│   │   └── recommendations.ts      # dashboard insights
│   └── pdf/
│       └── generate-report.ts      # jsPDF report builder
│
├── services/                       # Data access layer, swappable for a real API later
│   ├── storage.ts                  # safe localStorage wrapper (try/catch, SSR-safe)
│   ├── auth.service.ts
│   ├── records.service.ts
│   ├── momo.service.ts
│   ├── diagnoses.service.ts
│   ├── profile.service.ts
│   ├── onboarding.service.ts       # draft (resume), complete, the onboarded cookie
│   ├── market.service.ts           # mock prices + weather
│   └── loans.service.ts            # partner offers
│
├── store/                          # Zustand stores
│   ├── auth-store.ts
│   ├── farm-store.ts               # records, momo, diagnoses
│   ├── profile-store.ts
│   ├── onboarding-store.ts         # wizard step, answers, review jumps
│   ├── chat-store.ts
│   └── settings-store.ts           # language, notification toggles
│
├── hooks/
│   ├── use-farm-stats.ts           # derived totals, score, readiness
│   ├── use-mounted.ts
│   └── use-debounce.ts
│
├── types/
│   └── index.ts                    # All shared types
│
├── constants/
│   ├── navigation.ts               # nav items, page titles & subtitles
│   ├── crops.ts                    # crop list, base yields, prices, tips
│   ├── regions.ts                  # Ghana regions
│   └── loan-partners.ts
│
├── data/
│   └── mock/                       # market prices, weather, diagnoses, insights
│
├── public/
│   └── icons/ images/
│
├── proxy.ts                        # Next.js 16 (replaces middleware.ts): redirect unauthenticated users (cookie flag)
├── next.config.ts
├── tsconfig.json                   # path alias "@/*" -> "./*"
└── package.json
```

**Rules**
- Pages in `app/` stay thin. They compose components from `components/<feature>/` and do not contain business logic.
- All maths lives in `lib/calculations/`, as pure, testable functions.
- Components never touch `localStorage` directly. Only `services/` does.
- Use `"use client"` only where it is needed (interactive components and store consumers).
- Name files in kebab-case and components in PascalCase.

---

## 4. Types (`types/index.ts`)

```ts
export type RecordType = 'income' | 'expense' | 'activity';
export type Crop = 'Maize' | 'Cassava' | 'Rice' | 'Cocoa' | 'Yam' | 'Plantain' | 'Groundnut' | 'Tomato' | 'Other';

export interface FarmRecord {
  id: string;            // crypto.randomUUID(), never Date.now()
  userId: string;
  type: RecordType;
  description: string;   // ONE field name everywhere (old code mixed desc/description)
  crop: Crop;
  amount: number;        // activities may be 0
  date: string;          // ISO yyyy-MM-dd
  notes?: string;
  createdAt: string;
}

export interface MomoTransaction {
  id: string; userId: string;
  direction: 'in' | 'out';
  counterparty: string;
  amount: number;
  reference: string;
  network?: 'MTN' | 'Telecel' | 'AirtelTigo';
  date: string; createdAt: string;
}

export interface Diagnosis {
  id: string; userId: string;
  disease: string; severity: 'None' | 'Moderate' | 'High';
  confidence: number; treatment: string; crop?: Crop;
  imageThumb?: string; date: string;
}

export type FarmType = 'Smallholder' | 'Commercial' | 'Cooperative' | 'Out-grower';
export type SizeUnit = 'acres' | 'hectares';
export type GhanaCardStatus = 'not_provided' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  userId: string;
  name: string; email: string; phone: string;
  farmName: string; useNameAsFarmName: boolean;
  region: string; constituency: string; community?: string;
  gps?: { lat: number; lng: number };
  acres: number; sizeUnit: SizeUnit;          // acres always stored; unit for display
  primaryCrops: string[]; otherCrops?: string;
  farmType: FarmType; cooperativeName?: string; outgrowerCompany?: string;
  // Never the full card number: a mask (GHA-******789-0) and a SHA-256 hash only.
  ghanaCard: { status: GhanaCardStatus; masked?: string; hash?: string; submittedAt?: string; rejectedReason?: string };
  verification: { phone: boolean; location: boolean; ghanaCard: boolean }; // ghanaCard true only when status === 'verified'
  onboardingCompletedAt?: string;
}

export interface OnboardingDraft { userId: string; currentStep: number; data: Partial<Profile>; updatedAt: string; }

export interface ChatMessage { id: string; role: 'user' | 'ai'; content: string; createdAt: string; }

export interface CreditScoreBreakdown {
  score: number;              // 300–850
  paymentHistory: number;     // 0–100
  recordCompleteness: number; // 0–100
  incomeStability: number;    // 0–100
  momoActivity: number;       // 0–100
  verification: number;       // 0–100
}
```

---

## 5. Design System (match the original look)

The style is a **dark glassmorphism fintech dashboard** with an emerald accent.

**Tokens (dark, the default):** `--bg-1 #0a0e1a`, `--bg-2 #111827`, `--glass rgba(255,255,255,.06)`, `--glass-strong rgba(255,255,255,.1)`, `--border rgba(255,255,255,.12)`, `--text #f5f7fb`, `--text-dim #a8b0c0`, `--text-mute #6b7280`, `--accent #10b981`, `--accent-2 #34d399`, `--gold #f5c451`, `--danger #ef4444`, `--warning #f59e0b`, `--info #3b82f6`, `--purple #a855f7`, `--radius 20px`.

**Light theme:** `--bg-1 #f5f8fc`, `--bg-2 #edf3fb`, `--glass rgba(255,255,255,.82)`, `--glass-strong rgba(255,255,255,.94)`, `--border rgba(15,23,42,.12)`, `--text #101827`, `--text-dim #1f2937`, `--text-mute #475569`, `--accent #059669`, `--accent-2 #10b981`.

Expose these tokens to Tailwind through `@theme` so that classes like `bg-glass`, `text-dim` and `border-border` work.

**Visual elements to recreate**
- A static, subtle page background on every route: the theme colour (`--bg-1`) with a soft emerald glow top-left (`--bg-glow-1`) and a purple glow bottom-right (`--bg-glow-2`), fixed in place. Only these two colours; no blue, no lines, grid or dot patterns, no animation.
- Glass cards with `backdrop-blur-xl`, a 1px border, and a subtle top highlight line.
- A brand logo: a seedling icon in an emerald gradient square, with the name "AgriCtec" in Playfair Display, gradient emerald→gold.
- Stat cards with gradient icon tiles (green, blue, purple, gold), uppercase labels, large values, and an up/down change line.
- An **AI banner**: purple→blue→emerald gradient, a pulsing icon tile, and a title, subtitle and action button.
- A **score ring** using a conic-gradient, with the value in the center.
- Pill badges (green, red, blue, gold, purple) and AI chips.
- Buttons in three variants: primary (emerald gradient with glow), ghost (glass) and danger, plus a small size.
- Motion: fade-in-up on route change, lift on hover for cards and quick actions, toast slide-in.
- Respect `prefers-reduced-motion`.

**Responsive behavior**
- Fixed 260px sidebar at `lg` and above.
- Below 900px, an off-canvas drawer with a dark overlay. Closes on overlay click, Escape, or route change.
- Grids collapse to one column on mobile, and tables scroll horizontally.
- No horizontal page scroll anywhere. Touch targets are at least 44px.

---

## 6. Layout Shell

**Sidebar** (`constants/navigation.ts` drives it):
- **Main:** Dashboard, Farm Records, MoMo Transactions, Financial Reports
- **AI Powered:** AI Assistant, AI Crop Doctor, AI Yield Predictor
- **Finance:** Loans & Credit, Market & Weather
- **Account:** Profile, Settings

The active state comes from `usePathname()`. The footer shows the avatar initial, the farmer's name (default "New Farmer") and "Smallholder Farmer".

**Topbar:** mobile menu button, page title and subtitle (from the navigation constants), global search, a notification bell with a red dot, and the theme toggle.

**Global search:** debounced (300ms). It searches records by description and crop and MoMo transactions by counterparty, and shows a results dropdown; clicking a result navigates to that item. Do **not** show a toast on every keystroke, which the old app did.

---

## 7. Pages — Full Requirements

### 7.1 Auth (`/login`, `/signup`)
- Email + password forms with zod validation (valid email, password of at least 8 characters, matching confirm field on signup).
- `auth.service.ts` is a mock that stores users in localStorage and sets a session plus a cookie flag that `proxy.ts` reads.
- Add a **"Continue as guest (demo)"** option that creates a persistent demo user ID **once**. The old app generated a new random ID on every load and lost the user's data.
- Every `(main)` route redirects to `/login` when there is no session.
- Sign Out is only visible when signed in. On sign out, clear the session and redirect.

### 7.1a Onboarding (`/onboarding`)
- **Journey:** sign up (or sign in, or continue as guest) → if `profile.onboardingCompletedAt` is missing → `/onboarding` → six steps and a review → `/dashboard`. Until it is finished no app page opens: `proxy.ts` redirects with the `agrictec_onboarded` cookie (set on completion, cleared on sign-out), and the DataLoader checks the profile itself (the cookie is only a hint). An onboarded farmer visiting `/onboarding` goes to `/dashboard`; without a session it goes to `/login`.
- **Steps** (react-hook-form + one zod schema each; Continue validates only the current step and focuses the first error):
  1. **Farm name** (2–80 characters) with "Use my name as the farm name" (fills and locks the field). Guests get "Fill with demo details".
  2. **Location:** region (16), constituency (disabled until a region is picked; only that region's list, from `constants/constituencies.ts`), optional community, and an optional OpenStreetMap pin (Leaflet driven directly in `farm-map.tsx`, loaded with `next/dynamic` and `ssr: false`; react-leaflet 5's MapContainer broke when React re-ran effects, so it is not used): click to drop, drag to move, "Use my current location", pins outside Ghana (lat 4.5–11.2, lng −3.3–1.3) refused, `formatGPS()` under the map, and a friendly message when tiles can't load. The map follows the answers: choosing a region zooms to it, choosing a constituency moves to its main town, and the community field's "Find on map" searches towns and villages in Ghana (`services/geocoding.service.ts`, OpenStreetMap Nominatim, on request only) and moves there. Scroll or pinch zooms down to single fields; "Satellite" shows imagery with place names; "Larger map" enlarges it. Region, constituency, community and pin are saved to the draft as they change (not only on Continue).
  3. **Farm size** (> 0, up to 10,000) in acres or hectares; always stored in acres (1 ha = 2.47105 acres) with the unit kept for display, and a live conversion.
  4. **Crops:** multi-select chips (icons, never emoji), at least one; "Other" asks for the name(s). Crops without yield data are not offered in the Yield Predictor.
  5. **Farm type:** radio cards (Smallholder, Commercial, Cooperative, Out-grower); a cooperative needs its name, an out-grower may name the company.
  6. **Ghana Card (optional):** "I have a Ghana Card" (auto-formatted `GHA-XXXXXXXXX-X`, ownership confirmation; only the mask and a SHA-256 hash are kept) or "I'll do this later" (amber warning: no loans until verified). Submitted cards are **pending** in the admin's verifications queue until approved.
  - **Review:** every answer with an Edit link back to its step, a static map preview, a required confirmation, then "Complete setup".
- Every Continue saves a draft (`onboarding.service.ts`), so a refresh resumes on the same step with the same answers. "Sign out" keeps the draft.
- **Loans need a verified Ghana Card:** `checkEligibility()` adds "Verify your Ghana Card to apply for loans." (or "…being reviewed…" while pending); `/loans` shows a lock banner with "Verify now"; Apply and Check eligibility are disabled; the loans service refuses too; the assistant and recommendations say "Verify your Ghana Card to unlock loan offers." instead of promising a loan. The dashboard shows a dismissible "Add your Ghana Card to unlock loans" card while none is provided.
- The profile page edits every onboarding field later with the same step components, and shows the card status (Not provided / Pending review / Verified / Rejected + reason) with add or resubmit.

### 7.2 Dashboard
- **AI Insight banner.** With zero records, show an onboarding message. Otherwise, show an insight that rotates every 15 seconds and is derived from the user's real data (expense ratio, best crop, record count). Include an "Add Record" button.
- **Four stat cards:** Total Income (year to date), Total Expenses, Active Crops (with "across X acres" from the profile), and Credit Score.
- **Income vs Expenses line chart** for the last 6 months, with filled areas.
- **Loan Readiness card:** score ring plus a checklist: Account Created (always done), Financial Records (done when there are at least 5), MoMo Integration (done when there is at least 1 transaction), Profile Complete, Ghana Card.
- **Quick Actions grid:** Add Record, MoMo Txn, Crop Scan, Ask AI, Apply Loan, Export.
- **Recent Activity:** the six latest records and MoMo transactions combined, with an icon, label, date and signed, colored amount.
- **AI Recommendations** from `lib/ai/recommendations.ts`, driven by the data.

### 7.3 Farm Records
- Tabs: All, Income, Expenses, Activities.
- Table with columns Date, Type badge, Description, Crop, Amount and Actions (Edit, Delete). Delete asks for confirmation through `confirm-dialog`, not `window.confirm`.
- **Add/Edit Record modal:** type, description, crop, amount, date (defaults to today), and notes. Amount is optional for the "activity" type.
- Show "+" for income, "−" for expense, and **no sign or amount** for activities. The old app showed "+" on activities.
- Charts: a Crop Distribution doughnut (income by crop) and a Monthly Net bar chart with green/red bars for the **current year only**.
- Records are sortable by date and amount.
- Export the table to CSV.

### 7.4 MoMo Transactions
- Four stats: Inflows, Outflows, Net Balance, Transaction count.
- Table with columns Date, Received/Sent badge, Counterparty, Reference (monospace), Amount and Actions.
- **Add modal:** direction, counterparty, amount, reference (auto-generate `MOMO######` if blank), network, and date.
- A grouped bar chart of inflows vs outflows over the last 6 months.
- Ghana phone validation where relevant: `+233` or `0`, followed by 9 digits.

### 7.5 Financial Reports
- **Profit & Loss summary:** income, expenses, net profit, and margin percentage.
- **Financial Health ring** (20–100) with two data-driven insights.
- **Report cards:** Income Statement, Expense Report, Loan Readiness Report, Tax Summary. Each opens a preview modal.
- **Download must produce a real PDF** via `lib/pdf/generate-report.ts`, with a branded header, farmer and farm name, generation date, summary table, line-item table, and the AI assessment text. The old app's button said "PDF" but downloaded a `.txt` file.
- Annual trend line chart covering the last 12 months.

### 7.6 AI Assistant
- A chat UI where AI messages sit on the left with a gradient avatar and user messages sit on the right in an emerald bubble. The chat auto-scrolls and shows a typing indicator (700ms delay).
- Responses come from `lib/ai/assistant-replies.ts`, a keyword router covering: maize planting, fall armyworm and pests, credit score tips, cocoa prices, weather and rain, greetings, fertilizer, thanks, and a fallback. Return **structured content** (title, bullet list, tip) and render it with React components. **Do not use `innerHTML`.**
- Quick-prompt chips. Chat history persists in `chat-store`, with a "Clear chat" button.
- A capabilities side card listing Crop Advisory, Pest & Disease, Weather, Financial Planning, Market Analysis, and Multilingual support.
- Isolate the reply function behind `async getAssistantReply(message, context)` so it can later call a real LLM API.

### 7.7 AI Crop Doctor
- Drag-and-drop **and** click-to-upload zone. Accept images up to 10MB and show an error for other file types or larger files.
- Show an image preview, then a "Analyzing…" state (1.5s), then the diagnosis card: disease, severity badge, confidence, and recommended treatment.
- Mock diagnoses: Fall Armyworm, Maize Lethal Necrosis, Cassava Mosaic, Cocoa Black Pod, Healthy. Expose `async diagnoseCrop(file)` so a real vision API can be plugged in later.
- "Save Diagnosis" adds it to history, which keeps the 10 most recent and stores a small thumbnail.
- A Recent Diagnoses list.

### 7.8 AI Yield Predictor
- Form fields: crop, acreage (minimum 0.1), season (Major Mar–Jul or Minor Aug–Dec), fertilizer (4 options), and irrigation (rain-fed, drip, sprinkler).
- Calculation in `lib/calculations/yield.ts`:
  - **Base yields in tonnes per acre:** Maize 2.5, Cassava 15, Rice 3, Cocoa 0.8, Yam 12, Plantain 18, Groundnut 1.2, Tomato 15.
  - **Multipliers:** organic + inorganic fertilizer 1.35, inorganic only 1.25, organic only 1.15; drip irrigation 1.4, sprinkler 1.25; major season 1.1.
  - **Do not use `Math.random()`** in the result. The same inputs must always give the same output. Instead, return a **range**: low = −10%, high = +10%.
- Result card: predicted yield range in tonnes, per-acre figure, expected revenue (yield × price per tonne from `constants/crops.ts`), and an insight line.
- Crop-specific optimization tips: four per crop, taken from the original content.

### 7.9 Loans & Credit
- **Credit Profile:** score ring plus progress bars for each factor in `CreditScoreBreakdown`.
- **Use one credit score function** (`lib/calculations/credit-score.ts`) everywhere — dashboard, loans and reports. The old app had two different formulas that showed different scores. It should be a weighted sum of the breakdown factors, mapped to the 300–850 range.
- **Apply form:** amount, purpose (5 options), repayment period (6, 12, 24 or 36 months), then a Check Eligibility button.
- **Eligibility rules:** at least 5 records, **and** the requested amount is no more than 3× **annualized net profit**, **and** a credit score of at least 550. When not eligible, show the specific reasons.
- **Repayment:** use a proper amortization formula with the selected partner's interest rate. The old formula `amount / (months × 1.1)` produced a payment *lower* than the principal divided by months.
- **Partner offer cards:** Sinapi Aba Trust (18%, up to GHS 100k, 6–24 months), Opportunity Fund (22%, 50k, 3–12 months), AgriDev Microfinance (15%, 200k, 12–36 months), Rural Bank Consortium (20%, 150k, 6–24 months). Each card shows a match percentage computed from the user's score. "Apply Now" opens a confirmation modal summarizing the application. Clicking anywhere else on the card must not trigger it.

### 7.10 Market & Weather
- **Weather card:** location (from the profile region), temperature, description, humidity, rain chance, and an emoji or icon. Load it from `market.service.ts` and keep it **stable for the session**. The old app re-randomized the weather on every render.
- **AI Weather Advisory:** rule-based lines driven by rain, humidity and temperature.
- **Market prices list:** crop, unit, price in GHS, and percentage change with an up/down arrow and color. Use each crop's own emoji, not 🌾 for everything.
- Price Trends line chart for four crops over 6 months, seeded and deterministic.
- Show a label: "Indicative prices — demo data".

### 7.11 Profile
- **Personal:** full name, phone (MoMo, Ghana-validated) and email.
- **Farm details:** everything from onboarding (farm name, region, constituency, community, map pin, size in the farmer's unit, crops, farm type), each part edited in a dialog with the onboarding step's own component.
- **"Get Current Location":** use `navigator.geolocation` and store `{lat, lng}`. Display it through `formatGPS()` with correct N/S/E/W hemispheres and absolute values. The old app always printed "N" and "W" and showed negative numbers.
- **Digital Identity Verification grid:** Account, Phone, Farm Location, and Ghana Card, each marked Verified or Pending based on real profile state. Ghana Card uses a mock input with the format `GHA-XXXXXXXXX-X`.
- Saving updates the sidebar name and avatar immediately and shows a toast.

### 7.12 Settings
- **Appearance:** theme toggle and language select (English, Twi, Ga, Ewe, Hausa). Store the language and prepare a simple `t()` dictionary structure even if only English is filled in.
- **Notifications:** AI Insights, Weather Alerts and Market Price Alerts switches, **persisted** in `settings-store`. The old app did not persist them.
- **Account:** subscription plan (Free, with Upgrade at GHS 25/month as a modal), auth status, sign out, plus **Export my data (JSON)** and **Delete all local data** behind a confirmation.
- **About** card with version badges.

---

## 8. Bugs in the Old App — Must Be Fixed

1. **XSS:** user input (descriptions, counterparty, reference) was inserted with `innerHTML`. Render all content through React only.
2. Numeric `Date.now()` IDs were used in `onclick="deleteRecord(id)"`, which breaks for UUIDs. Use `crypto.randomUUID()`.
3. Field name was inconsistent: `desc` in some places, `description` in others. Use `description` everywhere.
4. A race condition between auth init and data load (`initializeAuth()` was not awaited). Hydrate the stores, then render. Guard against hydration mismatch with `use-mounted`.
5. A new random demo user ID was generated on each load without a session, so data appeared to vanish.
6. Diagnoses were saved but never loaded back.
7. Two different credit score formulas.
8. A wrong loan repayment formula.
9. A fake PDF download (actually `.txt`).
10. Random weather, prices, yield and confidence on every render.
11. A toast on every search keystroke.
12. Chart colors did not update on theme switch. Use `use-chart-theme.ts`, which reads CSS variables and re-renders when the theme changes.
13. Activities displayed a "+GHS 0" amount.
14. Notification and language settings were not persisted.
15. A theme flash on load (fixed by next-themes with `attribute="data-theme"`).
16. The mobile sidebar had no overlay.
17. Every view re-rendered on every change (`renderAll`). Use per-page components with store selectors.

---

## 9. State & Services Pattern

```ts
// services/records.service.ts
export const recordsService = {
  list: async (userId: string): Promise<FarmRecord[]> => { ... },
  create: async (input: NewRecordInput): Promise<FarmRecord> => { ... },
  update: async (id: string, patch: Partial<FarmRecord>): Promise<FarmRecord> => { ... },
  remove: async (id: string): Promise<void> => { ... },
};
```

- Stores call services and keep data in memory.
- Derived values (totals, monthly series, credit score) are computed in `hooks/use-farm-stats.ts`, never stored as duplicates. The React Compiler handles memoization.
- Every mutation shows a success or error toast through sonner.

---

## 10. Quality Bar

- TypeScript strict mode, with no `any`.
- ESLint and Prettier configured.
- Accessibility:
  - Semantic HTML.
  - Labelled inputs.
  - Modals that trap focus, close on Escape, and restore focus afterwards.
  - Visible focus rings.
  - WCAG AA contrast in **both** themes.
  - `aria-current` on the active nav item.
- Every list and table has an empty state, a loading skeleton, and error handling.
- Currency formatted as `GHS 1,234`, and dates as `18 Oct 2026`.
- Seed data: on first guest login, offer a **"Load sample data"** button with about 12 records and 6 MoMo transactions spread over 6 months, so charts are not empty for demos.
- The app must build with `next build` with zero errors and run with `npm run dev` (both use Turbopack in Next.js 16).

---

## 11. Deliverables & Order of Work

1. Project setup: Next.js 16 (Turbopack, React Compiler), Tailwind tokens, fonts, ThemeProvider, `cn()`, and the folder skeleton.
2. Types, constants, mock data, and the storage and services layer.
3. Zustand stores and `use-farm-stats`.
4. The `components/ui` primitives and the layout shell (sidebar, topbar, mobile drawer).
5. Auth pages and the route guard.
6. Pages in this order: Dashboard → Records → MoMo → Reports → Loans → Assistant → Crop Doctor → Yield → Market → Profile → Settings.
7. PDF generation, CSV export, and data export/import.
8. A final pass on responsiveness, accessibility, theme consistency, and a review of every item in Section 8.

Provide the complete code for every file. Do not leave placeholders like "// rest of code here".