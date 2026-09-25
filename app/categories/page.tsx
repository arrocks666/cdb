import Link from "next/link";

const categories = [
  { id: "mobile", name: "Mobile & Accessories", icon: "📱", desc: "Phone cases, chargers, cables" },
  { id: "womens-fashion", name: "Women's Fashion", icon: "👗", desc: "Sarees, tops, shoes, bags" },
  { id: "mens-fashion", name: "Men's Fashion", icon: "👔", desc: "T-shirts, panjabi, watches" },
  { id: "beauty", name: "Beauty & Personal Care", icon: "💄", desc: "Skincare, makeup, fragrances" },
  { id: "home-kitchen", name: "Home & Kitchen", icon: "🏠", desc: "Storage, tools, bedding, LED" },
  { id: "electronics", name: "Electronics & Gadgets", icon: "🎧", desc: "Earbuds, smart watches, speakers" },
  { id: "baby-kids", name: "Baby, Kids & Toys", icon: "🧸", desc: "Clothing, toys, baby care" },
];

export default function CategoriesPage() {
  return (
    <div>
      <div className="sticky top-[100px] z-40 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-serif text-lg font-bold md:text-xl">
            <span className="gold-text">All Categories</span>
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
        <div className="space-y-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="group flex items-center gap-4 rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark transition hover:-translate-y-0.5 hover:border-gold-primary hover:shadow-gold-soft"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-gold-primary/40 bg-gradient-to-b from-bg-card-elevated to-bg-card text-3xl">
                {cat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-text-muted md:text-sm">
                  {cat.desc}
                </p>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 text-gold-primary transition group-hover:translate-x-0.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}