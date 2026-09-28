// lib/translation.ts
// Shared Google Translate helper for Chinese → English

export async function translateToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data[0]?.map((item: any[]) => item[0]).join("") ?? text;
    return translated;
  } catch {
    return text;
  }
}

export async function translateBatch(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((t) => translateToEnglish(t)));
}