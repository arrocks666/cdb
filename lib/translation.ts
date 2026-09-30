// lib/translation.ts
// Google Translate helper with retry + fallback endpoints.
// Skips results that still have 2+ Chinese characters (translation failed).

const CJK_REGEX = /[\u4e00-\u9fff]/;

export function hasChinese(text: string | undefined | null): boolean {
  if (!text) return false;
  return CJK_REGEX.test(text);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Count Chinese characters in a string.
 */
function countChinese(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/**
 * Translate Chinese → English with retry.
 * Tries 2 endpoints, 3 attempts each.
 * Returns "" if translation fails or returns 2+ Chinese chars.
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return "";

  // If already English, return as-is
  if (!hasChinese(text)) return text;

  const endpoints = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=`,
    `https://translate.google.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=`,
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const base of endpoints) {
      try {
        const url = `${base}${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (res.status === 429) continue;
        if (!res.ok) continue;

        const data = await res.json();
        const translated =
          data[0]?.map((item: any[]) => item[0]).join("") ?? "";

        if (!translated || !translated.trim()) continue;

        // If translated still has 2+ Chinese chars, treat as failed
        const remainingChinese = countChinese(translated);
        if (remainingChinese > 1) continue;

        return translated;
      } catch {
        continue;
      }
    }
    if (attempt < 2) await sleep(1500);
  }

  return "";
}

export async function translateBatch(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((t) => translateToEnglish(t)));
}