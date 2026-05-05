// Helpers to construct dashboard URLs while preserving the rest of the query state.

export type DashboardParams = {
  page?: string | number;
  search?: string;
  filter?: string;
  sortBy?: string;
  sortOrder?: string;
  view?: string;
  calView?: string;
  anchor?: string;
  types?: string;
  person?: string;
};

export function buildDashboardHref(
  current: DashboardParams,
  override: Partial<DashboardParams>,
): string {
  const merged: DashboardParams = { ...current, ...override };
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `/?${qs}` : '/';
}
