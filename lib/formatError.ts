export function formatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return appendPostgrestDetails(error.message, error);
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const msg = (error as { message: string }).message;
    return appendPostgrestDetails(msg, error);
  }
  return fallback;
}

function appendPostgrestDetails(message: string, error: object): string {
  const details = 'details' in error && typeof (error as { details: unknown }).details === 'string'
    ? (error as { details: string }).details.trim()
    : '';
  if (details && !message.includes(details)) {
    return `${message}\n${details}`;
  }
  return message;
}
