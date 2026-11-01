import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { TransferProvider } from "../context/TransferContext";
import UploadTray from "../components/transfer/UploadTray";

export const metadata: Metadata = {
  title: "AirShare — #ShareOnAir",
  description: "Zero-Dollar Cloud Drive with Google Cloud Run & Telegram MTProto",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 h-screen overflow-hidden">
        <AuthProvider>
          <TransferProvider>
            {children}
            <UploadTray />
          </TransferProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
