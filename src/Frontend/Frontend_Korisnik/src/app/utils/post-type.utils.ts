const POST_TYPE_LABELS: Record<string, string> = {
  attraction:       'Attraction',
  restaurant:       'Restaurant',
  cultural_site:    'Cultural Site',
  monument:         'Monument',
  club:             'Nightlife',
  sports_facility:  'Activity',
  event:            'Event',
  accommodation:    'Accommodation',
  shop:             'Shop',
  other:            'Ostalo',
};

/**
 * Converts a raw postType value (e.g. "cultural_site") to a human-readable
 * label (e.g. "Cultural Site"). Falls back to title-casing the raw value if
 * no mapping is found, and returns `fallback` when the input is falsy.
 */
export function formatPostType(type?: string | null, fallback = 'Place'): string {
  if (!type) return fallback;
  const key = type.toLowerCase().replace(/\s+/g, '_');
  return POST_TYPE_LABELS[key]
    ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
