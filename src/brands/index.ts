import { anbessaBrand } from "./anbessa";
import { demoBrand } from "./demo";
import { BrandConfig } from "./types";

export * from "./types";
export { anbessaBrand } from "./anbessa";
export { demoBrand } from "./demo";

export const brands: Record<string, BrandConfig> = {
  anbessa: anbessaBrand,
  demo: demoBrand,
};

export function getActiveBrandId(): string {
  const envBrand = process.env.NEXT_PUBLIC_BRAND;
  if (envBrand && brands[envBrand]) {
    return envBrand;
  }
  return "anbessa";
}

export function getActiveBrand(brandId?: string): BrandConfig {
  const id = brandId || getActiveBrandId();
  return brands[id] || anbessaBrand;
}

export function generateBrandCss(): string {
  return Object.values(brands)
    .map((brand) => {
      const t = brand.tokens;
      const cssRules = `
  --background: ${t.background};
  --foreground: ${t.foreground};
  --card: ${t.card};
  --card-foreground: ${t.cardForeground};
  --muted: ${t.muted};
  --muted-foreground: ${t.mutedForeground};
  --border: ${t.border};
  --input: ${t.input};
  --primary: ${t.primary};
  --primary-foreground: ${t.primaryForeground};
  --primary-hover: ${t.primaryHover};
  --accent: ${t.accent};
  --accent-foreground: ${t.accentForeground};
  --accent-strong: ${t.accentStrong};
  --accent-soft: ${t.accentSoft};
  --success: ${t.success};
  --success-foreground: ${t.successForeground};
  --warning: ${t.warning};
  --warning-foreground: ${t.warningForeground};
  --danger: ${t.danger};
  --danger-foreground: ${t.dangerForeground};
  --ring: ${t.ring};
  --radius: ${t.radius};`;

      if (brand.id === "anbessa") {
        return `:root, [data-brand="anbessa"] {${cssRules}\n}\n`;
      }
      return `[data-brand="${brand.id}"] {${cssRules}\n}\n`;
    })
    .join("\n");
}
