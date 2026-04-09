import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { PortalProvider } from "@/context/portal-context";

export const metadata: Metadata = {
  title: "IndoCanada Club — Professional Referral & Career Community",
  description: "Canada's trusted professional network and referral marketplace. Request referrals, connect with employees at top companies, join professional communities, attend meetups, and accelerate your Canadian career journey.",
  keywords: "Canada jobs, referral, professional network, career community, job referral platform, IndoCanada",
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
            {children}
          </PortalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
