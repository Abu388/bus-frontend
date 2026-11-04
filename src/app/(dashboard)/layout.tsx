import * as React from "react";
import { AppShell } from "@/shared/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
