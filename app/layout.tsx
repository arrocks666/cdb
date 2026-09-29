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

// ⚠️ Change this to your real URL AFTER deploying to Netlify
// Example: "https://chinadailybazar.netlify.app"
const SITE_URL = "https://chinadailybazar.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ChinaDailyBazar — Best Chinese Products Delivered to Bangladesh",
    template: "%s | ChinaDailyBazar",
  },
  description:
    "Premium Chinese products delivered to Bangladesh. Trendy, quality, affordable. Shop electronics, fashion, home & living and more.",
  keywords: [
    "ChinaDailyBazar",
    "Chinese products Bangladesh",
    "online shopping Bangladesh",
    "e-commerce BD",
  ],

  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  openGraph: {
    type: "website",
    siteName: "ChinaDailyBazar",
    title: "ChinaDailyBazar — Best Chinese Products",
    description:
      "Trendy Chinese products at unbeatable prices. Delivered across Bangladesh in 7–15 days.",
    url: SITE_URL,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ChinaDailyBazar — Best Chinese Products Delivered to Bangladesh",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ChinaDailyBazar",
    description:
      "Trendy Chinese products at unbeatable prices. Delivered across Bangladesh.",
    images: ["/og-image.svg"],
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