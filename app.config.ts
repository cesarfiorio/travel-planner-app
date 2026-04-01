import type { ConfigContext, ExpoConfig } from 'expo/config';

type EasExtra = { eas?: { projectId?: string } };

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = (config.extra ?? {}) as EasExtra & { privacyPolicyUrl?: string };
  const projectId = process.env.EAS_PROJECT_ID ?? extra.eas?.projectId;

  const next: ExpoConfig = {
    ...config,
    name: config.name ?? 'RouteFlow',
    slug: config.slug ?? 'routeflow',
    runtimeVersion: { policy: 'appVersion' },
    updates: projectId
      ? {
          enabled: true,
          url: `https://u.expo.dev/${projectId}`,
          checkAutomatically: 'ON_LOAD',
          fallbackToCacheTimeout: 0,
        }
      : { enabled: false },
  };

  return next;
};
