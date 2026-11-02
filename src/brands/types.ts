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
  accent: string;
  accentForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  danger: string;
  dangerForeground: string;
  ring: string;
  radius: string;
}

export interface BrandConfig {
  id: string;
  name: string;
  shortName: string;
  logoPath: string;
  tokens: BrandTokens;
}
