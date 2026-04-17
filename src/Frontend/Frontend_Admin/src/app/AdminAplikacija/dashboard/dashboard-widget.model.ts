// ─────────────────────────────────────────────────────────────────────────────
// Widget catalogue — every possible panel the user can add to their dashboard
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetId =
  | 'kpi_stats'
  | 'visits_chart'
  | 'category_donut'
  | 'top_lokacije'
  | 'top_dogadjaji'
  | 'top_aktivnosti'
  | 'pending_requests'
  | 'activity_log'
  | 'map_preview'
  | 'tourist_kpis'
  | 'tourist_map'
  | 'tourist_preferences'
  | 'city_breakdown'
  | 'recent_reviews';

/** Visual width in the grid (1 = half, 2 = full) */
export type WidgetSpan = 1 | 2;

export interface WidgetDef {
  id: WidgetId;
  label: string;       // Display name in the picker
  description: string;       // Short description shown in picker
  icon: string;       // Emoji icon
  defaultSpan: WidgetSpan;   // Default column span
  adminOnly: boolean;      // Hidden for regular Admins (ORG role) if true
}

/** Saved per-user configuration for one widget slot */
export interface WidgetSlot {
  id: WidgetId;
  span: WidgetSpan;
}

/** Full dashboard layout config — stored in localStorage */
export interface DashboardConfig {
  slots: WidgetSlot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE — all available widgets
// ─────────────────────────────────────────────────────────────────────────────

export const WIDGET_CATALOGUE: WidgetDef[] = [
  {
    id: 'kpi_stats',
    label: 'KPI Kartice',
    description: 'Brzi pregled: lokacije, aktivnosti, dogadjaji, recenzije.',
    icon: '📊',
    defaultSpan: 2,
    adminOnly: false,
  },
  {
    id: 'visits_chart',
    label: 'Grafikon poseta',
    description: 'Bar chart poseta platformi u poslednjih 30 dana.',
    icon: '📈',
    defaultSpan: 2,
    adminOnly: false,
  },
  {
    id: 'category_donut',
    label: 'Raspored po kategoriji',
    description: 'Donut grafikon distribucije lokacija po kategoriji.',
    icon: '🍩',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'top_lokacije',
    label: 'Top lokacije',
    description: 'Najpopularnije lokacije po broju pregleda.',
    icon: '🏢',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'top_dogadjaji',
    label: 'Top dogadjaji',
    description: 'Najpopularniji dogadjaji po broju pregleda.',
    icon: '🎟️',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'top_aktivnosti',
    label: 'Top aktivnosti',
    description: 'Aktivnosti sa najviše interesovanja turista.',
    icon: '🎯',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'pending_requests',
    label: 'Zahtevi na čekanju',
    description: 'Lista zahteva koji čekaju odobrenje super administratora.',
    icon: '⏳',
    defaultSpan: 1,
    adminOnly: true,   // Only superadmin
  },
  {
    id: 'activity_log',
    label: 'Log aktivnosti',
    description: 'Nedavne akcije na platformi.',
    icon: '🕐',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'map_preview',
    label: 'Mapa kretanja turista',
    description: 'Toplotna mapa kretanja turista po regionima.',
    icon: '🌡️',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'tourist_kpis',
    label: 'Turistički KPI',
    description: 'Aktivni turisti, posete, povratni turisti.',
    icon: '👣',
    defaultSpan: 2,
    adminOnly: false,
  },
  {
    id: 'tourist_map',
    label: 'Mapa lokacija',
    description: 'Interaktivna mapa svih lokacija na platformi.',
    icon: '🗺️',
    defaultSpan: 2,
    adminOnly: false,
  },
  {
    id: 'tourist_preferences',
    label: 'Sklonosti turista',
    description: 'Bar grafikon kategorijskih preferencija turista.',
    icon: '❤️',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'city_breakdown',
    label: 'Distribucija po gradu',
    description: 'Procenat pregleda po gradovima.',
    icon: '🏙️',
    defaultSpan: 1,
    adminOnly: false,
  },
  {
    id: 'recent_reviews',
    label: 'Nedavne recenzije',
    description: 'Najnovije recenzije koje čekaju moderaciju.',
    icon: '⭐',
    defaultSpan: 2,
    adminOnly: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT LAYOUTS per role
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_LAYOUT_ADMIN: DashboardConfig = {
  slots: [
    { id: 'kpi_stats', span: 2 },
    { id: 'visits_chart', span: 2 },
    { id: 'pending_requests', span: 1 },
    { id: 'top_lokacije', span: 1 },
    { id: 'category_donut', span: 1 },
    { id: 'activity_log', span: 1 },
    { id: 'tourist_map', span: 2 },
    { id: 'tourist_kpis', span: 2 },
    { id: 'top_dogadjaji', span: 1 },
    { id: 'map_preview', span: 1 },
    { id: 'city_breakdown', span: 1 },
    { id: 'recent_reviews', span: 1 },
  ],
};

export const DEFAULT_LAYOUT_ORG: DashboardConfig = {
  slots: [
    { id: 'kpi_stats', span: 2 },
    { id: 'visits_chart', span: 2 },
    { id: 'top_lokacije', span: 1 },
    { id: 'category_donut', span: 1 },
    { id: 'tourist_map', span: 2 },
    { id: 'activity_log', span: 1 },
    { id: 'tourist_preferences', span: 1 },
    { id: 'recent_reviews', span: 2 },
  ],
};

// ── Helper — zamjena za @angular/cdk/drag-drop moveItemInArray ───────────
// Koristiti dok CDK nije instaliran (npm install @angular/cdk)
export function moveItemInArray<T>(array: T[], from: number, to: number): void {
  const item = array.splice(from, 1)[0];
  array.splice(to, 0, item);
}
