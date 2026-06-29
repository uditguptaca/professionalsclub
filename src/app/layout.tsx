import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { PortalProvider } from "@/context/portal-context";
import { MatrimonyProvider } from "@/context/matrimony-context";

export const metadata: Metadata = {
  title: "Professionals Club — Careers, Settlement & Community for Newcomers in Canada",
  description: "Helping newcomers and professionals build their future in Canada — job referrals, settlement guidance, mentorship, and a trusted community. Free, human help from people who've been there.",
  keywords: "Canada newcomers, settlement support, job referrals, career mentorship, professional community, newcomer jobs Canada",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <PortalProvider>
            <MatrimonyProvider>
              {children}
            </MatrimonyProvider>
          </PortalProvider>
        </AppProvider>
      </body>
    </html>
  );
}

