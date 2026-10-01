// lib/colorTranslations.ts
// Fast local dictionary for common 1688 color names.
// Avoids Google Translate for the most common cases.

const DICT: Record<string, string> = {
  "黑色": "Black",
  "白色": "White",
  "红色": "Red",
  "蓝色": "Blue",
  "绿色": "Green",
  "黄色": "Yellow",
  "紫色": "Purple",
  "粉色": "Pink",
  "橙色": "Orange",
  "桔黄": "Orange",
  "灰色": "Gray",
  "棕色": "Brown",
  "米白": "Off-White",
  "米色": "Beige",
  "藏青色": "Navy",
  "藏蓝": "Navy",
  "卡其灰": "Khaki Gray",
  "卡其": "Khaki",
  "深咖": "Dark Brown",
  "深蓝": "Dark Blue",
  "深绿": "Dark Green",
  "深灰": "Dark Gray",
  "深红": "Dark Red",
  "浅蓝": "Light Blue",
  "浅绿": "Light Green",
  "浅灰": "Light Gray",
  "浅粉": "Light Pink",
  "浅棕": "Light Brown",
  "浅紫": "Light Purple",
  "酒红": "Wine Red",
  "玫红色": "Rose Red",
  "玫红": "Rose Red",
  "桃皮红": "Peach Red",
  "紫罗兰": "Violet",
  "梅紫": "Plum Purple",
  "梦幻粉": "Dream Pink",
  "浅粉蓝": "Light Pink Blue",
  "水泥灰": "Cement Gray",
  "海水蓝": "Sea Blue",
  "柠檬黄": "Lemon Yellow",
  "暗绿": "Dark Green",
  "军绿": "Army Green",
  "草绿": "Grass Green",
  "墨绿": "Ink Green",
  "靛蓝": "Indigo",
  "牛仔蓝": "Denim Blue",
  "经典蓝": "Classic Blue",
  "克莱因蓝": "Klein Blue",
  "安可拉红": "Ancora Red",
  "蒙豆绿": "Mung Bean Green",
  "杏色": "Apricot",
  "金色": "Gold",
  "银色": "Silver",
  "铜色": "Copper",
  "青铜色": "Bronze",
  "天蓝色": "Sky Blue",
  "宝蓝色": "Royal Blue",
  "香槟色": "Champagne",
  "驼色": "Camel",
  "枣红": "Date Red",
  "藕粉色": "Lotus Pink",
  "豆沙色": "Bean Paste",
  "奶茶色": "Milk Tea",
  "摩卡色": "Mocha",
  "抹茶绿": "Matcha Green",
  "薄荷绿": "Mint Green",
  "荧光绿": "Neon Green",
  "荧光黄": "Neon Yellow",
  "荧光粉": "Neon Pink",
  "豹纹": "Leopard",
  "格子": "Plaid",
  "条纹": "Striped",
  "花色": "Floral",
  "混色": "Mixed",
  "多色": "Multi-Color",
};

export function translateColorName(raw: string): string | null {
  if (!raw) return null;

  const parts = raw
    .split(/[-–—]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const translated: string[] = [];
  for (const part of parts) {
    if (DICT[part]) {
      translated.push(DICT[part]);
      continue;
    }
    if (part === "水洗做旧" || part === "水洗") {
      translated.push("Washed");
      continue;
    }
    if (part === "做旧") {
      translated.push("Vintage");
      continue;
    }
    return null;
  }

  return translated.join(" ");
}