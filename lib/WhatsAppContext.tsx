"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { loadSettings, DEFAULT_SETTINGS } from "./firestoreSettings";

// Fallback numbers used until settings load
const FALLBACK_NUMBERS = ["8801689768307", "8619822310841"];

type WhatsAppContextType = {
  getNextNumber: () => string;
  buildMessage: (productTitle: string, productUrl: string) => string;
  openWhatsApp: (productTitle: string, productUrl: string) => void;
};

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

const COUNTER_KEY = "cdb_whatsapp_counter";

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [numbers, setNumbers] = useState<string[]>(FALLBACK_NUMBERS);

  // Load WhatsApp numbers from settings on mount
  useEffect(() => {
    loadSettings()
      .then((settings) => {
        const list: string[] = [];
        if (settings.whatsappNumber) {
          list.push(settings.whatsappNumber.replace(/\D/g, ""));
        }
        if (settings.whatsappNumber2) {
          list.push(settings.whatsappNumber2.replace(/\D/g, ""));
        }
        if (list.length > 0) setNumbers(list);
      })
      .catch(() => {});
  }, []);

  const getNextNumber = (): string => {
    if (typeof window === "undefined") return numbers[0];
    const current = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
    const next = (current + 1) % numbers.length;
    localStorage.setItem(COUNTER_KEY, next.toString());
    return numbers[next];
  };

  const buildMessage = (productTitle: string, productUrl: string) => {
    return `আই পণ্যটি কেনার জন্য বিস্তারিত জানতে চাই।\n\n${productTitle}\n\n${productUrl}`;
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