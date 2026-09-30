// lib/chinaLocations.ts
// Chinese province / city names → English.
// Used to translate location badges without hitting Google Translate.

export const PROVINCE_MAP: Record<string, string> = {
  // Municipalities
  "北京": "Beijing",
  "上海": "Shanghai",
  "天津": "Tianjin",
  "重庆": "Chongqing",

  // Provinces
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

  // Popular 1688 supplier cities
  "深圳": "Shenzhen",
  "深圳市": "Shenzhen",
  "广州": "Guangzhou",
  "广州市": "Guangzhou",
  "汕头": "Shantou",
  "汕头市": "Shantou",
  "东莞": "Dongguan",
  "东莞市": "Dongguan",
  "佛山": "Foshan",
  "佛山市": "Foshan",
  "中山": "Zhongshan",
  "中山市": "Zhongshan",
  "珠海": "Zhuhai",
  "珠海市": "Zhuhai",
  "惠州": "Huizhou",
  "惠州市": "Huizhou",
  "揭阳": "Jieyang",
  "揭阳市": "Jieyang",
  "潮州": "Chaozhou",
  "潮州市": "Chaozhou",
  "义乌": "Yiwu",
  "义乌市": "Yiwu",
  "金华": "Jinhua",
  "金华市": "Jinhua",
  "杭州": "Hangzhou",
  "杭州市": "Hangzhou",
  "宁波": "Ningbo",
  "宁波市": "Ningbo",
  "温州": "Wenzhou",
  "温州市": "Wenzhou",
  "嘉兴": "Jiaxing",
  "嘉兴市": "Jiaxing",
  "台州": "Taizhou",
  "台州市": "Taizhou",
  "绍兴": "Shaoxing",
  "绍兴市": "Shaoxing",
  "泉州": "Quanzhou",
  "泉州市": "Quanzhou",
  "厦门": "Xiamen",
  "厦门市": "Xiamen",
  "福州": "Fuzhou",
  "福州市": "Fuzhou",
  "莆田": "Putian",
  "莆田市": "Putian",
  "南京": "Nanjing",
  "南京市": "Nanjing",
  "苏州": "Suzhou",
  "苏州市": "Suzhou",
  "无锡": "Wuxi",
  "无锡市": "Wuxi",
  "常州": "Changzhou",
  "常州市": "Changzhou",
  "南通": "Nantong",
  "南通市": "Nantong",
  "徐州": "Xuzhou",
  "徐州市": "Xuzhou",
  "青岛": "Qingdao",
  "青岛市": "Qingdao",
  "济南": "Jinan",
  "济南市": "Jinan",
  "临沂": "Linyi",
  "临沂市": "Linyi",
  "潍坊": "Weifang",
  "潍坊市": "Weifang",
  "郑州": "Zhengzhou",
  "郑州市": "Zhengzhou",
  "洛阳": "Luoyang",
  "洛阳市": "Luoyang",
  "武汉": "Wuhan",
  "武汉市": "Wuhan",
  "长沙": "Changsha",
  "长沙市": "Changsha",
  "成都": "Chengdu",
  "成都市": "Chengdu",
  "西安": "Xi'an",
  "西安市": "Xi'an",
  "石家庄": "Shijiazhuang",
  "石家庄市": "Shijiazhuang",
  "保定": "Baoding",
  "保定市": "Baoding",
  "沈阳": "Shenyang",
  "沈阳市": "Shenyang",
  "大连": "Dalian",
  "大连市": "Dalian",
  "哈尔滨": "Harbin",
  "哈尔滨市": "Harbin",
  "长春": "Changchun",
  "长春市": "Changchun",
  "合肥": "Hefei",
  "合肥市": "Hefei",
  "南昌": "Nanchang",
  "南昌市": "Nanchang",
  "昆明": "Kunming",
  "昆明市": "Kunming",
  "南宁": "Nanning",
  "南宁市": "Nanning",
  "贵阳": "Guiyang",
  "贵阳市": "Guiyang",
  "兰州": "Lanzhou",
  "兰州市": "Lanzhou",
};

export function hasChinese(text: string | undefined | null): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Translate a Chinese location string to English.
 * Tries exact match first, then partial match, then strips 省/市 and retries.
 */
export function translateLocation(text: string | undefined | null): string {
  if (!text) return "";

  const raw = text.trim();

  // Exact match
  if (PROVINCE_MAP[raw]) return PROVINCE_MAP[raw];

  // Strip common suffixes
  const cleaned = raw
    .replace(/省$/, "")
    .replace(/市$/, "")
    .replace(/自治区$/, "")
    .replace(/自治州$/, "")
    .replace(/地区$/, "")
    .trim();

  if (PROVINCE_MAP[cleaned]) return PROVINCE_MAP[cleaned];

  // Partial match — longest contained key wins
  let best = "";
  let bestLen = 0;
  for (const key of Object.keys(PROVINCE_MAP)) {
    if (raw.includes(key) && key.length > bestLen) {
      best = PROVINCE_MAP[key];
      bestLen = key.length;
    }
  }
  if (best) return best;

  return "";
}