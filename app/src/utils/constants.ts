// PhoneTap — Constants & Config
export const APP_NAME = 'PhoneTap';
export const APP_TAGLINE = "The World's First SOCIAL Social Media";

// Server config (dev)
export const API_BASE_URL = 'https://phonetap-server.fly.dev/api';
export const WS_URL = 'wss://phonetap-server.fly.dev/ws';

// Video constraints
export const MAX_VIDEO_DURATION_SEC = 30;
export const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SEC * 1000;

// QR code
export const QR_TTL_MS = 30000; // 30 seconds — auto-rotate interval
export const QR_SIZE = 250;

// Human verification
export const SHAKE_THRESHOLD = 1.5; // g-force threshold for shake detection
export const REQUIRED_SHAKES = 3;
export const SHAKE_WINDOW_MS = 5000; // must complete 3 shakes within 5 seconds
export const SHAKE_COOLDOWN_MS = 400; // min time between shakes to avoid double-counting

// Colors — premium dark theme
export const COLORS = {
  background: '#0A0A0F',
  surface: '#14141F',
  surfaceLight: '#1E1E2E',
  primary: '#7C3AED',       // vivid purple
  primaryLight: '#A78BFA',
  secondary: '#06B6D4',     // cyan accent
  secondaryLight: '#67E8F9',
  accent: '#F472B6',        // pink accent
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  gradientStart: '#7C3AED',
  gradientEnd: '#06B6D4',
};

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
