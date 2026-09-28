import Link from "next/link";

const categories = [
  { id: "womens-fashion", name: "Women's Fashion", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "mens-fashion", name: "Men's Fashion", image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "shoes", name: "Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "bags", name: "Bags & Leather", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "mobile", name: "Mobile & Accessories", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "beauty", name: "Beauty & Makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "home-kitchen", name: "Home & Kitchen", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "appliances", name: "Home Appliances", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "baby-kids", name: "Mother & Baby", image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
  { id: "jewelry", name: "Jewelry", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&q=80&auto=format&fit=crop", count: 3 },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <Link href="/" aria-label="Back" className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-text-primary md:text-xl">All Categories</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="group overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden bg-bg-orange">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-3 md:p-4">
                <h3 className="text-sm font-bold text-text-primary transition group-hover:text-gold-primary md:text-base">
                  {cat.name}
                </h3>
                <p className="mt-0.5 text-[10px] text-text-muted md:text-xs">
                  {cat.count} subcategories
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}