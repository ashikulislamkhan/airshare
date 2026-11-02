import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { TransferProvider } from "../context/TransferContext";
import UploadTray from "../components/transfer/UploadTray";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

export const metadata: Metadata = {
  title: "AirShare — #ShareOnAir",
  description: "Zero-Dollar Cloud Drive with Google Cloud Run & Telegram MTProto",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#060b18] text-slate-100 h-screen overflow-hidden">
        <AuthProvider>
          <TransferProvider>
            {children}
            <ErrorBoundary fallback={null}>
              <UploadTray />
            </ErrorBoundary>
          </TransferProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
