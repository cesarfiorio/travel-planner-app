import * as Sentry from '@sentry/react-native';

type Extra = Record<string, unknown> | undefined;

function sentryReady(): boolean {
  return !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN?.trim());
}

/**
 * Central logging: dev-only console; production forwards warn/error to Sentry when DSN is set.
 * Do not use raw `console.*` in app code.
 */
export const logger = {
  debug(...args: unknown[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },

  info(...args: unknown[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },

  warn(message: string, extra?: Extra) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(message, extra);
      return;
    }
    if (sentryReady()) {
      Sentry.captureMessage(message, { level: 'warning', extra: extra as Record<string, string> | undefined });
    }
  },

  error(message: string, err?: unknown, extra?: Extra) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(message, err, extra);
      return;
    }
    if (!sentryReady()) {
      return;
    }
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: { message, ...(extra ?? {}) } });
    } else {
      Sentry.captureMessage(`${message}${err != null ? `: ${String(err)}` : ''}`, {
        level: 'error',
        extra: extra as Record<string, string> | undefined,
      });
    }
  },
};
