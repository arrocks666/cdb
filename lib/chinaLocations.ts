// lib/chinaLocations.ts
// Chinese province / city names → English.
// Used to translate location badges without hitting Google Translate.

export const PROVINCE_MAP: Record<string, string> = {
  // Provinces
  "北京": "Beijing",
  "上海": "Shanghai",
  "天津": "Tianjin",
  "重庆": "Chongqing",
  "河北": "Hebei",
  "山西": "Shanxi",
  "辽宁": "Liaoning",
  "吉林": "Jilin",
  "黑龙江": "Heilongjiang",
  "江苏": "Jiangsu",
  "浙江": "Zhejiang",
  "安徽": "Anhui",
  "福建": "Fujian",
  "江西": "Jiangxi",
  "山东": "Shandong",
  "河南": "Henan",
  "湖北": "Hubei",
  "湖南": "Hunan",
  "广东": "Guangdong",
  "海南": "Hainan",
  "四川": "Sichuan",
  "贵州": "Guizhou",
  "云南": "Yunnan",
  "陕西": "Shaanxi",
  "甘肃": "Gansu",
  "青海": "Qinghai",
  "台湾": "Taiwan",
  "内蒙古": "Inner Mongolia",
  "广西": "Guangxi",
  "西藏": "Tibet",
  "宁夏": "Ningxia",
  "新疆": "Xinjiang",
  "香港": "Hong Kong",
  "澳门": "Macau",

  // Common supplier cities (partial match inside longer strings)
  "义乌": "Yiwu",
  "广州": "Guangzhou",
  "深圳": "Shenzhen",
  "泉州": "Quanzhou",
  "温州": "Wenzhou",
  "宁波": "Ningbo",
  "东莞": "Dongguan",
  "佛山": "Foshan",
  "杭州": "Hangzhou",
  "苏州": "Suzhou",
  "金华": "Jinhua",
  "汕头": "Shantou",
  "中山": "Zhongshan",
  "珠海": "Zhuhai",
  "嘉兴": "Jiaxing",
  "台州": "Taizhou",
  "绍兴": "Shaoxing",
  "成都": "Chengdu",
  "武汉": "Wuhan",
  "南京": "Nanjing",
  "青岛": "Qingdao",
  "厦门": "Xiamen",
  "长沙": "Changsha",
  "郑州": "Zhengzhou",
};

/**
 * Returns true if text contains Chinese characters.
 */
export function hasChinese(text: string | undefined): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Translate a Chinese location string to English.
 * - Tries exact match first
 * - Then tries partial match (any key contained in text)
 * - Returns "" if nothing matches
 *
 * Examples:
 *   "福建" → "Fujian"
 *   "义乌市" → "Yiwu"
 *   "浙江省义乌市" → "Yiwu" (finds 义乌 first via partial match by length)
 */
export function translateLocation(text: string | undefined): string {
  if (!text) return "";

  // Exact match
  if (PROVINCE_MAP[text]) return PROVINCE_MAP[text];

  // Strip trailing 省 / 市 / 自治区 / 自治州
  const cleaned = text
    .replace(/省$/, "")
    .replace(/市$/, "")
    .replace(/自治区$/, "")
    .replace(/自治州$/, "")
    .replace(/自治县$/, "")
    .replace(/地区$/, "")
    .trim();

  if (PROVINCE_MAP[cleaned]) return PROVINCE_MAP[cleaned];

  // Partial match — find the longest key contained in the text
  let best = "";
  let bestLen = 0;
  for (const key of Object.keys(PROVINCE_MAP)) {
    if (text.includes(key) && key.length > bestLen) {
      best = PROVINCE_MAP[key];
      bestLen = key.length;
    }
  }
  if (best) return best;

  // No match — return empty so caller can decide
  return "";
}