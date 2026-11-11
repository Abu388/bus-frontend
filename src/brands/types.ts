export interface BrandTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  accent: string;
  accentForeground: string;
  accentStrong: string;
  accentSoft: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  danger: string;
  dangerForeground: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarBorder: string;
  sidebarActive: string;
  sidebarActiveForeground: string;
  radius: string;
}

export interface BrandConfig {
  id: string;
  name: string;
  shortName: string;
  logoPath: string;
  tokens: BrandTokens;
  mapCenter?: [number, number];
  mapZoom?: number;
  mapBounds?: [[number, number], [number, number]];
}
