// scripts/fix-chinese-titles.ts
// Fix Chinese titles. Runs on Firestore products.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CJK_REGEX = /[\u4e00-\u9fff]/;

function hasChinese(text: unknown): boolean {
  return typeof text === "string" && CJK_REGEX.test(text);
}

async function translateToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  HTTP ${res.status}`);
      return text;
    }
    const data = await res.json();
    const translated =
      data[0]?.map((item: any[]) => item[0]).join("") ?? text;
    return translated;
  } catch (err) {
    console.error(`  Fetch error:`, err);
    return text;
  }
}

async function main() {
  console.log("=== Fix Chinese Titles ===\n");

  const snap = await getDocs(collection(db, "products"));
  console.log(`Found ${snap.size} products\n`);

  const targets: Array<{
    id: string;
    title?: string;
    subtitle?: string;
    description?: string;
  }> = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    if (
      hasChinese(d.title) ||
      hasChinese(d.subtitle) ||
      hasChinese(d.description)
    ) {
      targets.push({
        id: docSnap.id,
        title: d.title,
        subtitle: d.subtitle,
        description: d.description,
      });
    }
  }

  console.log(`Products needing translation: ${targets.length}\n`);

  if (targets.length === 0) {
    console.log("All products are English. Nothing to fix.");
    process.exit(0);
  }

  // Test translation on first product before looping
  console.log("Testing translation on first product...");
  const testTitle = targets[0].title || "";
  console.log(`  Input: "${testTitle.slice(0, 60)}"`);
  const testResult = await translateToEnglish(testTitle);
  console.log(`  Output: "${testResult.slice(0, 60)}"\n`);

  if (testResult === testTitle) {
    console.error("Translation is not working. Aborting.");
    console.error("Check your internet or Google Translate availability.");
    process.exit(1);
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const updates: Record<string, string> = {};

    try {
      if (t.title && hasChinese(t.title)) {
        const translated = await translateToEnglish(t.title);
        if (translated && translated !== t.title) {
          updates.title = translated.slice(0, 100);
        }
      }

      if (t.subtitle && hasChinese(t.subtitle)) {
        const translated = await translateToEnglish(t.subtitle);
        if (translated && translated !== t.subtitle) {
          updates.subtitle = translated;
        }
      }

      if (t.description && hasChinese(t.description)) {
        const translated = await translateToEnglish(t.description);
        if (translated && translated !== t.description) {
          updates.description = translated;
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "products", t.id), updates);
        updated++;
        if (updated <= 5 || updated % 20 === 0) {
          console.log(
            `[${i + 1}/${targets.length}] ${t.id} — updated`
          );
        }
      } else {
        failed++;
        if (failed <= 5) {
          console.log(
            `[${i + 1}/${targets.length}] ${t.id} — skipped (no change)`
          );
        }
      }
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${targets.length}] ${t.id} — ERROR:`, err);
    }

    // Be gentle with Google
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});