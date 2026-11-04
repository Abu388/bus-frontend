import type { Metadata } from "next";
import { Inter, Noto_Sans_Ethiopic } from "next/font/google";
import { getActiveBrand, generateBrandCss } from "@/brands";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = getActiveBrand();
  return {
    title: {
      template: `%s | ${brand.shortName} Admin`,
      default: `${brand.name} - Fleet & Staff Management`,
    },
    description: `Central Staff and Fleet Administration Platform for ${brand.name}`,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = getActiveBrand();
  const brandStyles = generateBrandCss();

  return (
    <html
      lang="en"
      data-brand={brand.id}
      className={`${inter.variable} ${notoSansEthiopic.variable}`}
      style={{
        fontFamily: "var(--font-inter), var(--font-ethiopic), system-ui, sans-serif",
      }}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandStyles }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
