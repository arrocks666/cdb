import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { WishlistProvider } from "@/lib/WishlistContext";
import { CartProvider } from "@/lib/CartContext";
import { OrderProvider } from "@/lib/OrderContext";
import { WhatsAppProvider } from "@/lib/WhatsAppContext";
import { LiveProductProvider } from "@/lib/LiveProductContext";
import { AuthProvider } from "@/lib/AuthContext";
import { ProductsProvider } from "@/lib/ProductsContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// ✅ Final domain
const SITE_URL = "https://chinadailybazar.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ChinaDailyBazar — Best Chinese Products Delivered to Bangladesh",
    template: "%s | ChinaDailyBazar",
  },
  description:
    "Quality Chinese products, delivered across Bangladesh. Direct from verified 1688 manufacturers. Fast delivery, honest pricing.",
  keywords: [
    "ChinaDailyBazar",
    "Chinese products Bangladesh",
    "online shopping Bangladesh",
    "e-commerce BD",
    "1688 wholesale Bangladesh",
  ],

  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-icon.png",
  },

  openGraph: {
    type: "website",
    siteName: "ChinaDailyBazar",
    title: "ChinaDailyBazar — Best Chinese Products",
    description: "Quality Chinese products, delivered across Bangladesh.",
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChinaDailyBazar — Quality Chinese products delivered to Bangladesh",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ChinaDailyBazar",
    description: "Quality Chinese products, delivered across Bangladesh.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-base text-text-primary">
        <AuthProvider>
          <ProductsProvider>
            <WishlistProvider>
              <CartProvider>
                <OrderProvider>
                  <WhatsAppProvider>
                    <LiveProductProvider>
                      <AppShell>{children}</AppShell>
                    </LiveProductProvider>
                  </WhatsAppProvider>
                </OrderProvider>
              </CartProvider>
            </WishlistProvider>
          </ProductsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}