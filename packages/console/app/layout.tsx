import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { getInitialAuth } from "@/lib/auth";
import { PageFooter } from "@/components/page-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Wazoo",
    default: "Wazoo",
  },
  description: "The console for managing your Worlds.",
  icons: {
    icon: "/wazoo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuth = await getInitialAuth();

  const content = (
    <NuqsAdapter>
      <div className="flex-1 flex flex-col min-h-screen w-full min-w-0">
        <main className="flex-1 flex flex-col w-full min-w-0">{children}</main>
        <PageFooter />
      </div>
    </NuqsAdapter>
  );

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col`}
      >
        {initialAuth ? (
          <AuthKitProvider initialAuth={initialAuth}>{content}</AuthKitProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
