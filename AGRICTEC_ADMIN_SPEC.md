# AgriCtec — Super Admin Console (Build Prompt + Phases)

> **How to use:** Save this file in your project root as `AGRICTEC_ADMIN_SPEC.md`, next to `AGRICTEC_SPEC.md`. Do **not** paste it into the chat. It is the reference the admin phases point to. The phases are in `agrictec-admin-build-phases.md`.

---


## 1. Role & Goal

You are a senior frontend engineer. Add a **Super Admin Console** to the existing AgriCtec Next.js 16 app. Platform staff use it to **see and control the whole system**:

- every farmer and their data
- verifications
- loan applications and lending partners
- the credit score rules
- market and AI content
- announcements
- fraud and risk flags
- reports
- admin staff and their permissions
- the audit trail
- system-wide settings (feature flags, maintenance mode, plans, backups).

**Scope: frontend only**, the same as the farmer app. All data goes through `services/`, which use localStorage for now. Every service function is `async` and typed so that a real backend can replace it later.

> ⚠️ **Honest limitation:** with localStorage, the admin can only see farmers stored **in the same browser**. To make the console useful for demos and development, seed about **60 realistic mock farmers** (Section 9). A real multi-user admin needs a backend. The service layer is designed so that only the service function bodies change.

---

## 2. Roles & Permissions

### Roles
| Role | Who | Summary |
|---|---|---|
| `farmer` | App users | Farmer app only. **Never** reaches `/admin`. |
| `analyst` | Data/partnership staff | Read-only: overview, farmers, reports and analytics |
| `support` | Customer support | View farmers, review verifications, view loans, review risk flags |
| `admin` | Operations managers | Everything except managing admins, credit rules, system settings and permanent deletion |
| `super_admin` | Platform owner | **Full control of everything** |

### Permissions (`lib/admin/permissions.ts`)
```ts
export type Permission =
  | 'overview.view'
  | 'farmers.view' | 'farmers.edit' | 'farmers.suspend' | 'farmers.delete' | 'farmers.impersonate'
  | 'verifications.review'
  | 'loans.view' | 'loans.manage'
  | 'lenders.manage'
  | 'credit.configure'
  | 'content.manage'
  | 'announcements.send'
  | 'risk.review'
  | 'reports.export'
  | 'admins.manage'
  | 'audit.view'
  | 'settings.manage'
  | 'data.manage';
```

| Permission | analyst | support | admin | super_admin |
|---|:-:|:-:|:-:|:-:|
| overview.view | ✅ | ✅ | ✅ | ✅ |
| farmers.view | ✅ | ✅ | ✅ | ✅ |
| farmers.edit | | ✅ | ✅ | ✅ |
| farmers.suspend | | | ✅ | ✅ |
| farmers.delete | | | | ✅ |
| farmers.impersonate | | ✅ | ✅ | ✅ |
| verifications.review | | ✅ | ✅ | ✅ |
| loans.view | ✅ | ✅ | ✅ | ✅ |
| loans.manage | | | ✅ | ✅ |
| lenders.manage | | | ✅ | ✅ |
| credit.configure | | | | ✅ |
| content.manage | | | ✅ | ✅ |
| announcements.send | | | ✅ | ✅ |
| risk.review | | ✅ | ✅ | ✅ |
| reports.export | ✅ | | ✅ | ✅ |
| admins.manage | | | | ✅ |
| audit.view | | | ✅ | ✅ |
| settings.manage | | | | ✅ |
| data.manage | | | | ✅ |

Rules:
- `can(role, permission)` and the hook `useCan(permission)` control **both** what is visible (nav items, buttons) **and** which actions run. Every service action checks permission too.
- If a user opens a page they lack permission for, show a `<NoAccess />` screen, not a crash.

---

## 3. Folder Structure (additions only)

This keeps the farmer app's pattern: thin pages in `app/`, one components folder per page.

```
agrictec/
├── app/
│   ├── (admin-auth)/
│   │   └── admin-login/page.tsx            # /admin-login
│   └── (admin)/
│       └── admin/
│           ├── layout.tsx                  # Admin shell + guard
│           ├── loading.tsx
│           ├── error.tsx
│           ├── page.tsx                    # /admin  → Overview
│           ├── farmers/
│           │   ├── page.tsx                # list
│           │   └── [id]/page.tsx           # detail (await params)
│           ├── verifications/page.tsx
│           ├── loans/
│           │   ├── page.tsx                # applications pipeline
│           │   └── [id]/page.tsx
│           ├── lenders/page.tsx
│           ├── credit-rules/page.tsx
│           ├── content/
│           │   ├── market/page.tsx
│           │   ├── crops/page.tsx
│           │   ├── assistant/page.tsx
│           │   └── diagnoses/page.tsx
│           ├── announcements/page.tsx
│           ├── risk/page.tsx
│           ├── reports/page.tsx
│           ├── team/page.tsx               # admin users & roles
│           ├── audit-log/page.tsx
│           └── settings/page.tsx           # system settings
│
├── components/
│   └── admin/
│       ├── layout/        (admin-sidebar, admin-topbar, role-badge, no-access, impersonation-bar)
│       ├── shared/        (filter-bar, bulk-action-bar, status-badge, kpi-card, detail-row, detail-modal, json-diff)
│       ├── overview/
│       ├── farmers/       (farmer-quick-view-modal, detail/edit-profile-modal, …)
│       ├── verifications/ (review-modal)
│       ├── loans/
│       ├── lenders/       (lender-form-modal)
│       ├── credit-rules/
│       ├── content/
│       ├── announcements/
│       ├── risk/          (risk-detail-modal)
│       ├── reports/
│       ├── team/          (invite-modal)
│       ├── audit-log/     (audit-detail-modal)
│       └── settings/
│
├── lib/admin/
│   ├── permissions.ts      # roles, permission matrix, can()
│   ├── audit.ts            # withAudit() helper
│   ├── risk-rules.ts       # fraud detection rules (pure functions)
│   ├── analytics.ts        # platform-wide aggregations
│   └── seed.ts             # builds ~60 mock farmers with data
│
├── services/admin/
│   ├── admin-auth.service.ts
│   ├── farmers.service.ts
│   ├── verifications.service.ts
│   ├── loan-applications.service.ts
│   ├── lenders.service.ts
│   ├── config.service.ts          # credit rules, feature flags, plans, maintenance
│   ├── content.service.ts         # market prices, weather, crops, assistant KB, diagnoses
│   ├── announcements.service.ts
│   ├── risk.service.ts
│   ├── team.service.ts
│   ├── audit.service.ts
│   └── backup.service.ts
│
├── store/admin/
│   ├── admin-auth-store.ts
│   ├── admin-data-store.ts        # farmers, applications, flags (cached)
│   └── admin-ui-store.ts          # sidebar, impersonation
│
├── hooks/admin/
│   ├── use-can.ts
│   ├── use-platform-stats.ts
│   └── use-admin-table.ts         # search + filters + sort + pagination + selection
│
├── types/admin.ts
└── constants/admin-navigation.ts
```

---

## 4. Types (`types/admin.ts`)

```ts
export type AdminRole = 'analyst' | 'support' | 'admin' | 'super_admin';
export type Role = 'farmer' | AdminRole;
export type AccountStatus = 'active' | 'suspended' | 'pending_verification';

export interface AdminUser {
  id: string; name: string; email: string; role: AdminRole;
  status: 'active' | 'disabled'; mustChangePassword: boolean;
  lastLoginAt?: string; createdAt: string; createdBy?: string;
}

export interface FarmerAccount {             // admin's view of a farmer
  userId: string; email: string; isGuest: boolean;
  status: AccountStatus; suspendedReason?: string;
  createdAt: string; lastActiveAt?: string;
  profile: Profile;
  stats: { records: number; momo: number; income: number; expenses: number; score: number; diagnoses: number };
  tags: string[];                              // e.g. 'cooperative-lead', 'pilot-2026'
  adminNotes: { id: string; text: string; by: string; at: string }[];
}

export type VerificationKind = 'phone' | 'location' | 'ghanaCard';
export interface VerificationRequest {
  id: string; userId: string; kind: VerificationKind;
  submittedValue: string;                      // masked for ghanaCard
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string; reviewedBy?: string; reviewedAt?: string; reason?: string;
}

export type LoanStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'repaid' | 'defaulted';
export interface LoanApplication {
  id: string; reference: string;               // APP-2026-48213
  userId: string; partnerId: string;
  amount: number; months: number; purpose: string; rate: number; monthly: number;
  scoreAtApplication: number;
  status: LoanStatus;
  history: { status: LoanStatus; by: string; at: string; note?: string }[];
  createdAt: string;
}

export interface CreditConfig {
  version: number;
  weights: { paymentHistory: number; recordCompleteness: number; incomeStability: number; momoActivity: number; verification: number }; // must sum to 100
  targets: { recordsForFull: number; momoForFull: number; monthsWindow: number };
  bands: { fair: number; good: number; excellent: number };       // 500 / 650 / 750
  eligibility: { minRecords: number; minScore: number; maxProfitMultiplier: number };
  updatedAt: string; updatedBy: string;
}

export interface FeatureFlags {
  signupOpen: boolean; guestMode: boolean;
  aiAssistant: boolean; cropDoctor: boolean; yieldPredictor: boolean;
  loans: boolean; market: boolean; pdfReports: boolean;
  maintenanceMode: boolean; maintenanceMessage: string;
}

export interface Plan { id: 'free' | 'premium'; name: string; priceGHS: number; features: string[]; active: boolean; }

export interface Announcement {
  id: string; title: string; message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  audience: { kind: 'all' } | { kind: 'region'; regions: string[] } | { kind: 'crop'; crops: Crop[] };
  startsAt: string; endsAt?: string; active: boolean; dismissible: boolean;
  createdBy: string; createdAt: string;
}

export type RiskRuleId = 'duplicate_momo_ref' | 'amount_outlier' | 'burst_entries' | 'income_spike' | 'shared_phone' | 'shared_ghana_card' | 'backdated_bulk';
export interface RiskFlag {
  id: string; userId: string; rule: RiskRuleId;
  severity: 'low' | 'medium' | 'high';
  description: string; relatedIds: string[];
  status: 'open' | 'dismissed' | 'confirmed';
  detectedAt: string; reviewedBy?: string; reviewedAt?: string; note?: string;
}

export interface AssistantKnowledgeItem { id: string; keywords: string[]; reply: AssistantReply; active: boolean; priority: number; }

export interface AuditEntry {
  id: string; actorId: string; actorName: string; actorRole: AdminRole;
  action: string;                               // 'farmer.suspend', 'credit.update', ...
  targetType: 'farmer' | 'loan' | 'lender' | 'config' | 'content' | 'announcement' | 'risk' | 'admin' | 'system';
  targetId?: string; summary: string;
  before?: unknown; after?: unknown;
  createdAt: string;
}
```

---

## 5. Changes to the Existing Farmer App (required)

The admin must be able to **control** the farmer app, so the farmer app has to read its settings from config services instead of from hard-coded constants:

| Farmer feature | Before | After |
|---|---|---|
| Credit score | hard-coded weights in `credit-score.ts` | `calculateCreditScore(records, momo, profile, config: CreditConfig)`. The config comes from `config.service`, and the defaults equal the current values. |
| Loan eligibility | hard-coded 5 records / 550 / 3× | Reads `config.eligibility` |
| Loan partners | `constants/loan-partners.ts` | `lenders.service`. Only `active` lenders are shown. |
| Market prices & weather | mock files | `content.service`. When the admin sets a weather override, it is used instead of the mock. |
| Crop yields, prices & tips | `constants/crops.ts` | `content.service` (the constants become the seed defaults) |
| AI assistant replies | hard-coded router | Routes using the `AssistantKnowledgeItem[]` from `content.service`, sorted by priority |
| Crop doctor diagnoses | mock file | `content.service` |
| Navigation & pages | always on | Hidden or blocked by `FeatureFlags`. A disabled page shows "This feature is currently unavailable." |
| Maintenance mode | — | Farmers see a full-screen branded maintenance page with the admin's message. Admins are not affected. |
| Signup / guest | always on | Hidden when `signupOpen` or `guestMode` is false |
| Suspended account | — | Login is blocked with "Your account is suspended. Contact support." An already-open session is signed out on the next load. |
| Announcements | — | An `AnnouncementBanner` at the top of the farmer dashboard shows the active announcements for that farmer's region and crops. Dismissals are remembered per farmer. |
| Loan applications | stored, no status | A **"My Applications"** section on `/loans` shows the status timeline the admin updates. |
| Verifications | instant (mock) | Ghana Card submissions become `pending` until an admin approves them. Phone and location stay instant but also create an approved record. |
| Plans | hard-coded GHS 25 | Read from `config.service` |

---

## 6. Authentication & Route Protection

- **Separate login page** at `/admin-login`, with an admin-styled card and the text "AgriCtec Admin Console".
- **Seeded super admin** (demo only): `superadmin@agrictec.app`, password `Admin@2026`, with `mustChangePassword: true`. At first login the admin is **forced** to the change-password screen.
- After 5 failed attempts, lock the login for 5 minutes (stored in localStorage; demo).
- Admin session: `agrictec:admin-session`, plus the cookies `agrictec_admin=1` and `agrictec_role=<role>`.
- **Session timeout:** after 30 minutes of inactivity, show a warning dialog with a countdown, then sign out.
- **`proxy.ts` update:**
  - `/admin/*` without the `agrictec_admin` cookie redirects to `/admin-login?next=…`
  - `/admin-login` with the cookie redirects to `/admin`
  - farmer routes keep their existing logic
  - a farmer session never grants admin access.
- Add a comment: cookies are UX redirects only, not security. A real backend must enforce roles on every request.

---

## 7. Admin Design

- Reuse the farmer app's design tokens, components and glass style, so it feels like the same product.
- **Admin identity:** a **gold + purple** accent for the admin shell, so staff always know they're in the console.
  - The sidebar brand reads "AgriCtec **Admin**" with a gold "CONSOLE" tag.
  - The active nav items use a purple tint instead of emerald.
  - The top bar shows a `RoleBadge` (super_admin gold, admin purple, support blue, analyst grey).
- Pages are **dense but readable**: tables with sticky headers, filter bars, bulk selection, pagination (25 per page), and detail views that open in a centered modal.
- **Modals, not drawers:** every detail, edit and review view opens in the shared centered `Modal` (`components/ui/modal.tsx`) on a dimmed, blurred backdrop, at every screen size (never a bottom sheet or side panel).
  - Sizes: sm 420px, md 560px, lg 760px, xl 960px, full 95vw. Header and footer stay fixed; the body scrolls inside the modal (max 90vh).
  - Focus is trapped, Escape closes only the top-most modal, focus returns to the opener, and the page behind doesn't scroll.
  - A form with unsaved changes asks "Discard changes?" before it closes.
  - Shared views: `detail-modal` (lg), `farmer-quick-view-modal` (lg), `edit-profile-modal` (md), `review-modal` (lg, verifications), `lender-form-modal` (md), `risk-detail-modal` (xl), `audit-detail-modal` (xl), `invite-modal` (md, team).
- Desktop-first, with every page still usable at 768px. Below 768px, tables become stacked cards.
- Destructive actions use red `ConfirmDialog`s. **Permanent deletes require typing the target's name or email.**

### Admin navigation (`constants/admin-navigation.ts`)
| Section | Items (with permission) |
|---|---|
| **Overview** | Dashboard (overview.view) |
| **Farmers** | All Farmers (farmers.view), Verifications (verifications.review), Risk & Fraud (risk.review) |
| **Lending** | Loan Applications (loans.view), Lenders (lenders.manage), Credit Rules (credit.configure) |
| **Content** | Market & Weather, Crops & Yields, AI Assistant, Crop Diagnoses (content.manage), Announcements (announcements.send) |
| **Insights** | Reports & Analytics (reports.export) |
| **System** | Team & Roles (admins.manage), Audit Log (audit.view), System Settings (settings.manage) |

Nav items the user lacks permission for are **hidden**. Badge counts (pending verifications, open risk flags, new applications) appear next to the relevant items.

---

## 8. Audit Logging (non-negotiable)

**Every** admin write action is recorded through one helper:

```ts
// lib/admin/audit.ts
export async function withAudit<T>(
  meta: { action: string; targetType: AuditEntry['targetType']; targetId?: string; summary: string; before?: unknown },
  fn: () => Promise<T>,
): Promise<T>
// 1. check permission for the current admin (throws 'Not allowed')
// 2. run fn()
// 3. append AuditEntry with `after` = result
// 4. return result
```

- The audit log is **append-only**. There is no edit or delete for anyone, including super_admin.
- Keep up to 5,000 entries. When it exceeds that, archive the oldest into a downloadable JSON file rather than silently dropping them.

---

## 9. Seed Data (`lib/admin/seed.ts`)

`seedPlatform()` runs once, on the first admin login, if there is no seed yet. It creates:

- **About 60 farmers** spread over all 16 regions, weighted towards Ashanti, Eastern, Bono, Northern and Volta.
  - Realistic Ghanaian names (e.g. Akosua Mensah, Kwame Owusu, Abena Boateng, Yaw Asante, Fatima Issah, Seidu Abdulai).
  - Crops that match each region (cocoa in the Western, Ashanti and Eastern regions; maize, groundnut and yam in the north).
  - 0 to 40 records each, and 0 to 20 MoMo transactions.
  - Signup dates spread over the last 12 months.
  - A mix of statuses: about 85% active, 5% suspended, 10% pending verification.
- **About 25 loan applications** across all statuses, each with a history.
- **About 12 pending verification requests.**
- **About 8 risk flags**, produced by running the real risk rules on purposely suspicious seeded data.
- **Team:** the super admin, plus 1 admin, 2 support and 1 analyst. Every one of them has the demo password `Team@2026`.
- The default `CreditConfig` (version 1), `FeatureFlags` (all on, maintenance off), plans, and content (from the existing constants).
- 3 announcements: one active for everyone, one for the Northern region, and one expired.

All dates are relative to today. Add a **"Reset demo data"** action in System Settings (super_admin only).

---

## 10. Quality Bar

- Next.js 16 rules: `proxy.ts`; `await params` in `[id]` pages; Turbopack.
- TypeScript strict, with no `any`. No `innerHTML`.
- Every list has search, filters, sorting, pagination, an empty state, a loading skeleton, and CSV export where it makes sense.
- Every write shows a toast **and** creates an audit entry.
- Accessibility: keyboard-usable tables, centered modals and dialogs, plus `aria-sort`, `aria-current` and labelled controls.
- No side drawers for content. All detail, edit and review views open in the shared centered Modal (components/ui/modal.tsx). The mobile navigation sidebar is the only slide-in panel.
- `npm run build` passes with zero errors.

---