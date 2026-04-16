import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { PortalProvider } from "@/context/portal-context";

export const metadata: Metadata = {
  title: "Professionals Club — Professional Referral & Career Community",
  description: "The premier portal for Canadian professionals to refer job seekers, share resources, and provide mentorship.",
  keywords: "Canada jobs, referral, professional network, career community, job referral platform, Professionals Club",
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
