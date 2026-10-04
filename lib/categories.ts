export type Subcategory = {
  id: string;
  name: string;
  keyword: string;
  keywordCN: string;
  categoryId: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  subcategories: Subcategory[];
};

export const categories: Category[] = [
  {
    id: "womens-fashion",
    name: "Women's Fashion",
    icon: "👗",
    subcategories: [
      { id: "dresses", name: "Dresses", keyword: "women dress", keywordCN: "女士连衣裙", categoryId: "womens-fashion" },
      { id: "womens-tshirt", name: "T-Shirts", keyword: "women t-shirt", keywordCN: "女士T恤", categoryId: "womens-fashion" },
      { id: "tops", name: "Tops", keyword: "women top", keywordCN: "女士上衣", categoryId: "womens-fashion" },
      { id: "kurtis", name: "Kurtis", keyword: "women kurti", keywordCN: "女士长款上衣", categoryId: "womens-fashion" },
    ],
  },
  {
    id: "mens-fashion",
    name: "Men's Fashion",
    icon: "👔",
    subcategories: [
      { id: "mens-tshirt", name: "T-Shirts", keyword: "men t-shirt", keywordCN: "男士T恤", categoryId: "mens-fashion" },
      { id: "shirts", name: "Shirts", keyword: "men shirt", keywordCN: "男士衬衫", categoryId: "mens-fashion" },
      { id: "jackets", name: "Jackets", keyword: "men jacket", keywordCN: "男士夹克", categoryId: "mens-fashion" },
    ],
  },
  {
    id: "shoes",
    name: "Shoes",
    icon: "👟",
    subcategories: [
      { id: "womens-shoes", name: "Women's Shoes", keyword: "women shoes", keywordCN: "女鞋", categoryId: "shoes" },
      { id: "mens-shoes", name: "Men's Shoes", keyword: "men shoes", keywordCN: "男鞋", categoryId: "shoes" },
      { id: "sneakers", name: "Sneakers", keyword: "sneakers", keywordCN: "运动鞋", categoryId: "shoes" },
      { id: "sandals", name: "Sandals", keyword: "women sandals", keywordCN: "女士凉鞋", categoryId: "shoes" },
    ],
  },
  {
    id: "bags",
    name: "Bags & Leather",
    icon: "👜",
    subcategories: [
      { id: "handbags", name: "Handbags", keyword: "handbag", keywordCN: "女士手提包", categoryId: "bags" },
      { id: "backpacks", name: "Backpacks", keyword: "backpack", keywordCN: "双肩包", categoryId: "bags" },
      { id: "wallets", name: "Wallets", keyword: "wallet", keywordCN: "钱包", categoryId: "bags" },
    ],
  },
  {
    id: "mobile",
    name: "Mobile & Accessories",
    icon: "📱",
    subcategories: [
      { id: "phone-cases", name: "Phone Cases", keyword: "phone case", keywordCN: "手机壳", categoryId: "mobile" },
      { id: "chargers", name: "Chargers & Cables", keyword: "phone charger", keywordCN: "手机充电器", categoryId: "mobile" },
      { id: "earphones", name: "Earphones", keyword: "tws earbuds", keywordCN: "蓝牙耳机", categoryId: "mobile" },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Makeup",
    icon: "💄",
    subcategories: [
      { id: "skincare", name: "Skincare", keyword: "face cream", keywordCN: "面霜", categoryId: "beauty" },
      { id: "makeup", name: "Makeup", keyword: "makeup", keywordCN: "化妆品", categoryId: "beauty" },
      { id: "perfume", name: "Perfume", keyword: "perfume", keywordCN: "香水", categoryId: "beauty" },
    ],
  },
  {
    id: "home-kitchen",
    name: "Home & Kitchen",
    icon: "🏠",
    subcategories: [
      { id: "storage", name: "Storage Boxes", keyword: "storage box", keywordCN: "收纳盒", categoryId: "home-kitchen" },
      { id: "kitchen", name: "Kitchen Tools", keyword: "kitchen tool", keywordCN: "厨房工具", categoryId: "home-kitchen" },
      { id: "bedding", name: "Bedding", keyword: "bedding", keywordCN: "床上用品", categoryId: "home-kitchen" },
    ],
  },
  {
    id: "appliances",
    name: "Home Appliances",
    icon: "🔌",
    subcategories: [
      { id: "mini-fan", name: "Small Fans", keyword: "mini fan", keywordCN: "迷你风扇", categoryId: "appliances" },
      { id: "led-light", name: "LED Lighting", keyword: "led light", keywordCN: "LED灯", categoryId: "appliances" },
      { id: "small-appliance", name: "Kitchen Appliances", keyword: "small appliance", keywordCN: "小家电", categoryId: "appliances" },
    ],
  },
  {
    id: "baby-kids",
    name: "Mother & Baby",
    icon: "🧸",
    subcategories: [
      { id: "baby-clothes", name: "Baby Clothing", keyword: "baby clothing", keywordCN: "婴儿服装", categoryId: "baby-kids" },
      { id: "baby-care", name: "Diapers", keyword: "diapers", keywordCN: "尿布", categoryId: "baby-kids" },
      { id: "kids-toys", name: "Toys", keyword: "kids toy", keywordCN: "儿童玩具", categoryId: "baby-kids" },
    ],
  },
  {
    id: "jewelry",
    name: "Jewelry & Accessories",
    icon: "💍",
    subcategories: [
      { id: "necklaces", name: "Necklaces", keyword: "necklace", keywordCN: "项链", categoryId: "jewelry" },
      { id: "rings", name: "Rings", keyword: "ring", keywordCN: "戒指", categoryId: "jewelry" },
      { id: "watches", name: "Watches", keyword: "watch", keywordCN: "手表", categoryId: "jewelry" },
    ],
  },
  {
    id: "kitchen-dining",
    name: "Kitchen & Dining",
    icon: "🍽️",
    subcategories: [
      { id: "cookware", name: "Cookware", keyword: "cookware set", keywordCN: "厨具套装", categoryId: "kitchen-dining" },
      { id: "knives", name: "Kitchen Knives", keyword: "kitchen knife", keywordCN: "厨房刀具", categoryId: "kitchen-dining" },
      { id: "food-storage", name: "Food Storage", keyword: "food storage container", keywordCN: "食品保鲜盒", categoryId: "kitchen-dining" },
    ],
  },
  {
    id: "electronics-accessories",
    name: "Electronics & Accessories",
    icon: "🔌",
    subcategories: [
      { id: "usb-cables", name: "USB Cables", keyword: "usb cable", keywordCN: "USB数据线", categoryId: "electronics-accessories" },
      { id: "power-banks", name: "Power Banks", keyword: "power bank", keywordCN: "移动电源", categoryId: "electronics-accessories" },
      { id: "phone-stands", name: "Phone Holders", keyword: "phone holder stand", keywordCN: "手机支架", categoryId: "electronics-accessories" },
    ],
  },
  {
    id: "fitness-outdoors",
    name: "Fitness & Outdoors",
    icon: "🏋️",
    subcategories: [
      { id: "yoga-mats", name: "Yoga Mats", keyword: "yoga mat", keywordCN: "瑜伽垫", categoryId: "fitness-outdoors" },
      { id: "dumbbells", name: "Dumbbells", keyword: "dumbbell set", keywordCN: "哑铃套装", categoryId: "fitness-outdoors" },
      { id: "water-bottles", name: "Sports Water Bottles", keyword: "sports water bottle", keywordCN: "运动水壶", categoryId: "fitness-outdoors" },
    ],
  },
];

export const allSubcategories = categories.flatMap((c) => c.subcategories);