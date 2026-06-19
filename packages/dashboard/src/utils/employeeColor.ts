// Distinct, accessible colors for employee identification in calendar views
const EMPLOYEE_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#ca8a04', // yellow
  '#db2777', // pink
  '#4f46e5', // indigo
  '#65a30d', // lime
  '#0d9488', // teal
  '#7c3aed', // violet
];

/**
 * Geeft een stabiele kleur per medewerker.
 * Als `orderedIds` (de volledige medewerkerlijst) wordt meegegeven, baseren we de
 * kleur op de POSITIE in die lijst → twee medewerkers krijgen gegarandeerd nooit
 * dezelfde kleur. Zonder lijst valt het terug op een hash (kan toevallig botsen).
 */
export function getEmployeeColor(employeeId: string | undefined, orderedIds?: string[]): string {
  if (!employeeId) return '#6b7280'; // gray fallback

  if (orderedIds && orderedIds.length) {
    const idx = orderedIds.indexOf(employeeId);
    if (idx >= 0) return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
  }

  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = (hash * 31 + employeeId.charCodeAt(i)) | 0;
  }
  return EMPLOYEE_COLORS[Math.abs(hash) % EMPLOYEE_COLORS.length];
}
