"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin-panel/products")}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-gold-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Products
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Edit Product
        </div>

        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Edit Product
        </h1>
        <p className="mt-1 font-mono text-xs text-text-muted">ID: {id}</p>
      </div>

      <ProductForm productId={id} />
    </div>
  );
}