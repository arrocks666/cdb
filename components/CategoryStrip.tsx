import Link from "next/link";

const categories = [
  { id: "womens-fashion", name: "Women's Fashion", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "mens-fashion", name: "Men's Fashion", image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "shoes", name: "Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "bags", name: "Bags & Leather", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "mobile", name: "Mobile & Accessories", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "beauty", name: "Beauty & Makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "home-kitchen", name: "Home & Kitchen", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "appliances", name: "Home Appliances", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "baby-kids", name: "Mother & Baby", image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&q=80&auto=format&fit=crop" },
  { id: "jewelry", name: "Jewelry", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&q=80&auto=format&fit=crop" },
];

export default function CategoryStrip() {
  return (
    <section className="bg-white px-4 py-4 md:py-6">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="mb-3 flex items-center justify-between md:mb-5">
          <h2 className="text-base font-bold text-text-primary md:text-xl">
            Shop by Category
          </h2>
          <Link href="/categories" className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-primary transition hover:text-gold-muted md:text-sm">
            See All →
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-2 md:grid-cols-10 md:gap-3">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/categories/${cat.id}`} className="group flex flex-col items-center gap-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-orange transition duration-200 group-hover:border-gold-primary group-hover:shadow-md">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <span className="text-center text-[10px] font-medium leading-tight text-text-primary transition group-hover:text-gold-primary md:text-xs">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}