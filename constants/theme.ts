// Single source of truth for the entire app

export const COLORS = {
  // Backgrounds
  pageBg: '#F3F4F6',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',

  // Brand
  primary: '#F05A1A',
  primaryLight: '#FEF0EB',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderFocus: '#F05A1A',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // Tab bar
  tabActive: '#F05A1A',
  tabInactive: '#9CA3AF',
  tabBg: '#FFFFFF',

  // Avatars (cycle through these)
  avatar: ['#DBEAFE', '#D1FAE5', '#FEE2E2', '#FEF3C7', '#EDE9FE'],
  avatarIcon: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'],
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenH: 56, // paddingTop for screens (below status bar)
  screenH_sm: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 100,
  circle: 9999,
} as const;

export const FONT = {
  // Sizes
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  h2: 22,
  h1: 28,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
