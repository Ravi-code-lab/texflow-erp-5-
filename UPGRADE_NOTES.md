# TexFlow ERP v5.0 — Upgrade Notes

## 🚀 What's New: ERPNext-Style Upgrade

### 1. Sidebar (`src/components/Sidebar.tsx`)
- **ERPNext-style collapsible module groups** with color-coded dots per module
- **Live search** with result cards showing icon + description + doctype
- **Command Palette trigger** with ⌘K shortcut hint in the sidebar footer
- **Notification badge** on Bell icon showing unread count
- **Smooth animations** on group expand/collapse with staggered item reveal
- **System status pill** at footer (online indicator)
- **Better user footer** with hover-reveal logout button

### 2. Dashboard (`src/components/Dashboard.tsx`)
- **ERPNext-style Workspace Tabs** — Home / Selling / Buying / Manufacturing / Stock / Accounts / HR
- **Per-tab Shortcut Grid** — 8 quick-action buttons per module tab (4×2 grid)
- **Per-tab DocType Links** — most-used documents for each module
- **KPI Cards** on Home tab — Revenue, Production, Pending Orders, Low Stock
- **Sales Trend Chart** — 6-month area chart with recharts
- **Module Overview Grid** — clickable module cards linking to tabs
- **Smooth tab transitions** with AnimatePresence

### 3. Registry (`src/modules/registry.ts`)
- **`description` field** on every module item — shown in search results and tooltips
- **`MODULE_COLOR_MAP`** exported for consistent color usage across components
- **`getViewDescription()`** helper function
- **`getModuleGroupByView()`** helper for breadcrumb resolution
- **`accentColor` and `color` fields** on module groups for theming

### 4. App.tsx (Topbar Upgrade)
- **ERPNext-style breadcrumb** — Module › DocType with naming series badge
- **Compact 48px header** (was 56px) for more content space
- **Bell notification icon** in topbar with unread badge
- **Sidebar now receives** `onCommandPalette` and `notificationCount` props
- **Dashboard full-width** — no extra padding wrapper when on DASHBOARD view

### 5. PlaceholderModule (`src/components/PlaceholderModule.tsx`)
- Complete redesign with ERPNext-style empty state
- Breadcrumb path display (Module › Title)
- Animated icon card + development badge

### 6. index.html (CSS Additions)
- `.scrollbar-none` utility class
- `.module-card` hover effect with indigo shadow
- `.workspace-tab-active` tab indicator styles
- `.page-enter` / `.page-enter-active` transition utilities

---

## Breaking Changes
None — all upgrades are additive. Existing components are untouched.

## File Summary
| File | Change |
|------|--------|
| `src/components/Sidebar.tsx` | Full rewrite |
| `src/components/Dashboard.tsx` | Full rewrite |
| `src/components/PlaceholderModule.tsx` | Full rewrite |
| `src/modules/registry.ts` | Enhanced with descriptions, colors, helpers |
| `src/app/App.tsx` | Topbar patched, Sidebar props added |
| `index.html` | CSS utilities added |
| `package.json` | Version → 5.0.0 |
