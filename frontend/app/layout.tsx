import type {
  Metadata,
} from "next";

import "./globals.css";

import AssistantGate from "@/components/assistant/AssistantGate";

import {
  MobileSidebarProvider,
} from "@/components/dashboard/MobileSidebarProvider";

export const metadata: Metadata = {
  title: "PRAVAAH",

  description:
    "Disaster Intelligence and Emergency Response Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body>

        <MobileSidebarProvider>

          {children}

          <AssistantGate />

        </MobileSidebarProvider>

      </body>

    </html>
  );
}