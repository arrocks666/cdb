"use client";

import { createContext, useContext, ReactNode } from "react";

// TWO WhatsApp numbers — will rotate in a cycle
const WHATSAPP_NUMBERS = [
  "8801965119476",
  "8801879129735",
];

type WhatsAppContextType = {
  getNextNumber: () => string;
  buildMessage: (productTitle: string, productUrl: string) => string;
  openWhatsApp: (productTitle: string, productUrl: string) => void;
};

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

const COUNTER_KEY = "cdb_whatsapp_counter";

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const getNextNumber = (): string => {
    if (typeof window === "undefined") return WHATSAPP_NUMBERS[0];
    const current = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
    const next = (current + 1) % WHATSAPP_NUMBERS.length;
    localStorage.setItem(COUNTER_KEY, next.toString());
    return WHATSAPP_NUMBERS[next];
  };

  const buildMessage = (productTitle: string, productUrl: string) => {
    return `Hi! I'm interested in this product:\n\n${productTitle}\n\n${productUrl}\n\nPlease give me more details.`;
  };

  const openWhatsApp = (productTitle: string, productUrl: string) => {
    const number = getNextNumber();
    const message = encodeURIComponent(buildMessage(productTitle, productUrl));
    window.open(`https://wa.me/${number}?text=${message}`, "_blank");
  };

  return (
    <WhatsAppContext.Provider value={{ getNextNumber, buildMessage, openWhatsApp }}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error("useWhatsApp must be used inside WhatsAppProvider");
  return ctx;
}