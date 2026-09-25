import Link from "next/link";

const categories = [
  {
    id: "mobile",
    name: "Mobile",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "womens-fashion",
    name: "Women's",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "mens-fashion",
    name: "Men's",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "beauty",
    name: "Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "home-kitchen",
    name: "Home & Kitchen",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "electronics",
    name: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "baby-kids",
    name: "Baby & Kids",
    image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "more",
    name: "More",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80&auto=format&fit=crop",
  },
];

export default function CategoryStrip() {
  return (
    <section className="px-4 py-4 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center justify-between md:mb-5">
          <h2 className="font-serif text-base font-bold md:text-2xl">
            <span className="gold-text">Shop by Category</span>
          </h2>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-primary transition hover:text-gold-luxury md:text-sm"
          >
            See All
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3 md:grid-cols-8 md:gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="group flex flex-col items-center gap-2"
            >
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gold-primary/50 bg-bg-card shadow-card-dark transition duration-200 group-hover:-translate-y-0.5 group-hover:border-gold-primary group-hover:shadow-gold-soft">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Gold overlay on hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <span className="text-center text-[10px] font-medium leading-tight text-gold-primary transition group-hover:text-gold-luxury md:text-xs">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}