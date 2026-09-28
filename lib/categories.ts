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
    id: "womens-fashion",
    name: "Women's Fashion",
    icon: "👗",
    subcategories: [
      { id: "dresses", name: "Dresses", keyword: "women dress", categoryId: "womens-fashion" },
      { id: "womens-tshirt", name: "T-Shirts", keyword: "women t-shirt", categoryId: "womens-fashion" },
      { id: "tops", name: "Tops", keyword: "women top", categoryId: "womens-fashion" },
    ],
  },
  {
    id: "mens-fashion",
    name: "Men's Fashion",
    icon: "👔",
    subcategories: [
      { id: "mens-tshirt", name: "T-Shirts", keyword: "men t-shirt", categoryId: "mens-fashion" },
      { id: "shirts", name: "Shirts", keyword: "men shirt", categoryId: "mens-fashion" },
      { id: "jackets", name: "Jackets", keyword: "men jacket", categoryId: "mens-fashion" },
    ],
  },
  {
    id: "shoes",
    name: "Shoes",
    icon: "👟",
    subcategories: [
      { id: "womens-shoes", name: "Women's Shoes", keyword: "women shoes", categoryId: "shoes" },
      { id: "mens-shoes", name: "Men's Shoes", keyword: "men shoes", categoryId: "shoes" },
      { id: "sneakers", name: "Sneakers", keyword: "sneakers", categoryId: "shoes" },
    ],
  },
  {
    id: "bags",
    name: "Bags & Leather",
    icon: "👜",
    subcategories: [
      { id: "handbags", name: "Handbags", keyword: "handbag", categoryId: "bags" },
      { id: "backpacks", name: "Backpacks", keyword: "backpack", categoryId: "bags" },
      { id: "wallets", name: "Wallets", keyword: "wallet", categoryId: "bags" },
    ],
  },
  {
    id: "mobile",
    name: "Mobile & Accessories",
    icon: "📱",
    subcategories: [
      { id: "phone-cases", name: "Phone Cases", keyword: "phone case", categoryId: "mobile" },
      { id: "chargers", name: "Chargers & Cables", keyword: "phone charger", categoryId: "mobile" },
      { id: "earphones", name: "Earphones", keyword: "earphone", categoryId: "mobile" },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Makeup",
    icon: "💄",
    subcategories: [
      { id: "skincare", name: "Skincare", keyword: "face cream", categoryId: "beauty" },
      { id: "makeup", name: "Makeup", keyword: "makeup", categoryId: "beauty" },
      { id: "perfume", name: "Perfume", keyword: "perfume", categoryId: "beauty" },
    ],
  },
  {
    id: "home-kitchen",
    name: "Home & Kitchen",
    icon: "🏠",
    subcategories: [
      { id: "storage", name: "Storage Boxes", keyword: "storage box", categoryId: "home-kitchen" },
      { id: "kitchen", name: "Kitchen Tools", keyword: "kitchen tool", categoryId: "home-kitchen" },
      { id: "bedding", name: "Bedding", keyword: "bedding", categoryId: "home-kitchen" },
    ],
  },
  {
    id: "appliances",
    name: "Home Appliances",
    icon: "🔌",
    subcategories: [
      { id: "mini-fan", name: "Small Fans", keyword: "mini fan", categoryId: "appliances" },
      { id: "led-light", name: "LED Lighting", keyword: "led light", categoryId: "appliances" },
      { id: "small-appliance", name: "Kitchen Appliances", keyword: "small appliance", categoryId: "appliances" },
    ],
  },
  {
    id: "baby-kids",
    name: "Mother & Baby",
    icon: "🧸",
    subcategories: [
      { id: "baby-clothes", name: "Baby Clothing", keyword: "baby clothing", categoryId: "baby-kids" },
      { id: "baby-care", name: "Diapers", keyword: "diapers", categoryId: "baby-kids" },
      { id: "kids-toys", name: "Toys", keyword: "kids toy", categoryId: "baby-kids" },
    ],
  },
  {
    id: "jewelry",
    name: "Jewelry & Accessories",
    icon: "💍",
    subcategories: [
      { id: "necklaces", name: "Necklaces", keyword: "necklace", categoryId: "jewelry" },
      { id: "rings", name: "Rings", keyword: "ring", categoryId: "jewelry" },
      { id: "watches", name: "Watches", keyword: "watch", categoryId: "jewelry" },
    ],
  },
];

export const allSubcategories = categories.flatMap((c) => c.subcategories);