// ============================================================
// ESCOLA LIBERAL — Localized Content Resolver
// Looks for field_en, field_es suffixes; falls back to base (PT)
// ============================================================
function getLocalizedField(obj, field) {
  if (!obj) return '';
  var lang = window.CURRENT_LANG || 'pt';
  if (lang === 'pt') return obj[field] || '';
  var localized = obj[field + '_' + lang];
  return localized || obj[field] || '';
}
window.getLocalizedField = getLocalizedField;
