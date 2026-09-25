export type Subcategory = {
  id: string;
  name: string;
  keyword: string;
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
    id: "mobile",
    name: "Mobile & Accessories",
    icon: "📱",
    subcategories: [
      { id: "phone-case", name: "Phone Cases", keyword: "phone case", categoryId: "mobile" },
      { id: "charger", name: "Chargers", keyword: "phone charger", categoryId: "mobile" },
      { id: "earphone", name: "Earphones", keyword: "earphone", categoryId: "mobile" },
      { id: "screen-protector", name: "Screen Protectors", keyword: "screen protector", categoryId: "mobile" },
      { id: "power-bank", name: "Power Banks", keyword: "power bank", categoryId: "mobile" },
    ],
  },
  {
    id: "womens-fashion",
    name: "Women's Fashion",
    icon: "👗",
    subcategories: [
      { id: "saree", name: "Sarees", keyword: "saree", categoryId: "womens-fashion" },
      { id: "womens-top", name: "Tops", keyword: "women top", categoryId: "womens-fashion" },
      { id: "womens-shoes", name: "Women's Shoes", keyword: "women shoes", categoryId: "womens-fashion" },
      { id: "handbag", name: "Handbags", keyword: "handbag", categoryId: "womens-fashion" },
      { id: "jewelry", name: "Jewelry", keyword: "jewelry set", categoryId: "womens-fashion" },
    ],
  },
  {
    id: "mens-fashion",
    name: "Men's Fashion",
    icon: "👔",
    subcategories: [
      { id: "tshirt", name: "T-Shirts", keyword: "mens t-shirt", categoryId: "mens-fashion" },
      { id: "panjabi", name: "Panjabi", keyword: "panjabi", categoryId: "mens-fashion" },
      { id: "mens-shoes", name: "Men's Shoes", keyword: "mens shoes", categoryId: "mens-fashion" },
      { id: "mens-watch", name: "Watches", keyword: "mens watch", categoryId: "mens-fashion" },
      { id: "wallet", name: "Wallets", keyword: "wallet", categoryId: "mens-fashion" },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Personal Care",
    icon: "💄",
    subcategories: [
      { id: "skincare", name: "Skincare", keyword: "face cream", categoryId: "beauty" },
      { id: "makeup", name: "Makeup", keyword: "makeup", categoryId: "beauty" },
      { id: "haircare", name: "Hair Care", keyword: "hair oil", categoryId: "beauty" },
      { id: "perfume", name: "Fragrances", keyword: "perfume", categoryId: "beauty" },
      { id: "beauty-tools", name: "Beauty Tools", keyword: "makeup brush", categoryId: "beauty" },
    ],
  },
  {
    id: "home-kitchen",
    name: "Home & Kitchen",
    icon: "🏠",
    subcategories: [
      { id: "storage", name: "Storage", keyword: "storage box", categoryId: "home-kitchen" },
      { id: "kitchen", name: "Kitchen Tools", keyword: "kitchen tool", categoryId: "home-kitchen" },
      { id: "small-appliance", name: "Small Appliances", keyword: "small appliance", categoryId: "home-kitchen" },
      { id: "bedding", name: "Bedding", keyword: "bedding", categoryId: "home-kitchen" },
      { id: "led-light", name: "LED Lighting", keyword: "led light", categoryId: "home-kitchen" },
    ],
  },
  {
    id: "electronics",
    name: "Electronics & Gadgets",
    icon: "🎧",
    subcategories: [
      { id: "tws", name: "TWS Earbuds", keyword: "tws earbuds", categoryId: "electronics" },
      { id: "smartwatch", name: "Smart Watches", keyword: "smart watch", categoryId: "electronics" },
      { id: "speaker", name: "Bluetooth Speakers", keyword: "bluetooth speaker", categoryId: "electronics" },
      { id: "phone-acc", name: "Phone Accessories", keyword: "mobile accessory", categoryId: "electronics" },
      { id: "mini-fan", name: "Mini Fans", keyword: "mini fan", categoryId: "electronics" },
    ],
  },
  {
    id: "baby-kids",
    name: "Baby, Kids & Toys",
    icon: "🧸",
    subcategories: [
      { id: "baby-clothes", name: "Baby Clothing", keyword: "baby clothing", categoryId: "baby-kids" },
      { id: "kids-toy", name: "Kids' Toys", keyword: "kids toy", categoryId: "baby-kids" },
      { id: "educational-toy", name: "Educational Toys", keyword: "educational toy", categoryId: "baby-kids" },
      { id: "baby-care", name: "Baby Care", keyword: "baby care", categoryId: "baby-kids" },
      { id: "baby-acc", name: "Kids' Accessories", keyword: "baby accessory", categoryId: "baby-kids" },
    ],
  },
];

export const allSubcategories = categories.flatMap((c) => c.subcategories);