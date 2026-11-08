import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { TransferProvider } from "../context/TransferContext";
import UploadTray from "../components/transfer/UploadTray";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import PWARegister from "../components/common/PWARegister";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL("https://ashikulislamkhan.github.io/airshare/"),
  title: "AirShare",
  description: "High-Performance Cloud Storage with Unlimited Capacity",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AirShare",
  },
  icons: {
    icon: `${basePath}/logo.png`,
    shortcut: `${basePath}/favicon.ico`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  verification: {
    google: "ZbyOG2gq1udf0XlCt9y9IuxT7FfFA_2yHXnyoWMHguM",
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
      <head>
        <meta name="google-site-verification" content="ZbyOG2gq1udf0XlCt9y9IuxT7FfFA_2yHXnyoWMHguM" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#060b18" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AirShare" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__AIRSHARE_INSTALL_PROMPT__ = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__AIRSHARE_INSTALL_PROMPT__ = e;
                window.dispatchEvent(new CustomEvent('airshare_prompt_ready'));
              });
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[#090d16] text-slate-100 h-screen overflow-hidden">
        <PWARegister />
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
