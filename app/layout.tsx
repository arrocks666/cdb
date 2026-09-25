import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { WishlistProvider } from "@/lib/WishlistContext";
import { CartProvider } from "@/lib/CartContext";
import { OrderProvider } from "@/lib/OrderContext";

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

export const metadata: Metadata = {
  title: "ChinaDailyBazar — Best Chinese Products • Better Prices • Delivered to Bangladesh",
  description:
    "Premium Chinese products delivered to Bangladesh. Trendy, quality, affordable. Shop electronics, fashion, home & living and more.",
  keywords: [
    "ChinaDailyBazar",
    "Chinese products Bangladesh",
    "online shopping Bangladesh",
    "e-commerce BD",
  ],
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
        <WishlistProvider>
          <CartProvider>
            <OrderProvider>
              <Header />
              <main className="flex-1 pb-20 md:pb-4">{children}</main>
              <BottomNav />
            </OrderProvider>
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}