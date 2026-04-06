/** e.g. "Porto, Portugal" → "Porto - Portugal" for the itinerary header line. */
export function formatItineraryDestinationSubtitle(destinationLabel: string | null | undefined, tripName: string | null | undefined): string {
  const raw = destinationLabel?.trim() || tripName?.trim() || '';
  if (!raw) {
    return '';
  }
  return raw.replace(/\s*,\s*/g, ' - ');
}
