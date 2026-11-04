"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatBDT } from "@/lib/adminOrders";
import ImageSearchModal from "@/components/ImageSearchModal";
import { LiveProduct } from "@/lib/liveProduct";
import { OrderService, Order } from "@/lib/OrderContext";
import { loadSettings, DEFAULT_SETTINGS, type StoreSettings } from "@/lib/firestoreSettings";
import { sendOrderEmail } from "@/lib/sendEmail";

type ManualItem = {
  title: string;
  price: number;
  quantity: number;
  image: string;
  variant: string;
};

type SavedAddress = {
  name?: string;
  phone?: string;
  address?: string;
  district?: string;
  email?: string;
};

type FoundUser = {
  uid: string;
  name?: string;
  phone?: string;
  email?: string;
  savedAddress?: SavedAddress;
};

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery" },
  { id: "bank", label: "Bank Transfer" },
];

// ✅ FIX: Robust phone normalization (handles +880, 880, 01)
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return "0" + digits.slice(3);
  }
  if (digits.startsWith("88") && digits.length === 13) {
    return "0" + digits.slice(3);
  }
  return digits;
}

async function generateUniqueOrderId(): Promise<string> {
  const id = String(Math.floor(100000 + Math.random() * 900000));
  return id;
}

export default function NewAdminOrderPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [payment, setPayment] = useState("cod");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState<ManualItem[]>([
    { title: "", price: 0, quantity: 1, image: "", variant: "" },
  ]);
  const [selectedServices, setSelectedServices] = useState<OrderService[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ✅ FIX: New User Lookup State
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  
  // We use a ref to close the dropdown if the user clicks outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageSearchJobId, setImageSearchJobId] = useState<string | null>(null);
  const [imageSearchResults, setImageSearchResults] = useState<LiveProduct[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const imageSearchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AVAILABLE_SERVICES: OrderService[] = [
    { id: "video_inspection", name: "Video Inspection", price: settings.videoInspectionPrice ?? 180 },
    { id: "basic_inspection", name: "General Inspection", price: settings.basicInspectionPrice ?? 50 },
  ];

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const subtotal = items.reduce(
    (sum, it) => sum + (it.price || 0) * (it.quantity || 0),
    0
  );
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const total = subtotal + (shipping || 0) + servicesTotal;

  const updateItem = (idx: number, patch: Partial<ManualItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { title: "", price: 0, quantity: 1, image: "", variant: "" },
    ]);

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleService = (service: OrderService) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // ✅ FIX: The Unified User Search (Phone or Name)
  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setLookingUp(true);
    setShowDropdown(true);
    const results: FoundUser[] = [];
    
    try {
      // 1. Search by Phone (normalized)
      const normalized = normalizePhone(queryText);
      if (normalized.length >= 3) {
        const qPhone = query(
          collection(db, "users"),
          where("phone", ">=", normalized),
          where("phone", "<=", normalized + "\uf8ff"),
          limit(5)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach((doc) => {
          const data = doc.data();
          results.push({
            uid: doc.id,
            name: data.name || data.savedAddress?.name || "",
            phone: data.phone || data.savedAddress?.phone || "",
            email: data.email || "",
            savedAddress: data.savedAddress || {},
          });
        });
      }

      // 2. Search by Name (lowercase matching)
      if (queryText.length >= 2) {
        const qName = query(
          collection(db, "users"),
          where("name", ">=", queryText),
          where("name", "<=", queryText + "\uf8ff"),
          limit(5)
        );
        const snapName = await getDocs(qName);
        snapName.forEach((doc) => {
           const data = doc.data();
           if (!results.find(u => u.uid === doc.id)) {
             results.push({
               uid: doc.id,
               name: data.name || data.savedAddress?.name || "",
               phone: data.phone || data.savedAddress?.phone || "",
               email: data.email || "",
               savedAddress: data.savedAddress || {},
             });
           }
        });
      }

      setSearchResults(results.slice(0, 5));
      if (results.length === 0) setShowDropdown(false);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLookingUp(false);
    }
  };

  // ✅ FIX: Debounce the search so it triggers as admin types
  useEffect(() => {
    const timer = setTimeout(() => {
      const searchTerm = phone.trim() || name.trim();
      if (searchTerm.length >= 2) {
        handleSearch(searchTerm);
      }
    }, 400); 

    return () => clearTimeout(timer);
  }, [phone, name]);

  // ✅ FIX: Select a user from the dropdown
  const selectUser = (user: FoundUser) => {
    setFoundUser(user);
    setShowDropdown(false);
    
    setName(user.name || "");
    setPhone(user.phone || user.savedAddress?.phone || "");
    setEmail(user.email || "");
    setAddress(user.savedAddress?.address || "");
    setDistrict(user.savedAddress?.district || "");
  };

  const clearUser = () => {
    setFoundUser(null);
    setSearchResults([]);
    setShowDropdown(false);
    setPhone("");
    setName("");
    setEmail("");
    setAddress("");
    setDistrict("");
  };

  const handleUploadPhoto = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Image must be under 8MB. Please compress or resize.");
      return;
    }

    setUploadingIndex(idx);
    try {
      let finalFile = file;

      const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
      const isSmall = file.size < 500 * 1024;

      if (!isJpeg || !isSmall) {
        const { resizeImage } = await import("@/lib/resizeImage");
        finalFile = await resizeImage(file, 1600, 0.85); 
      }

      const fd = new FormData();
      fd.append("image", finalFile);
      
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      updateItem(idx, { image: data.url });
      
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(
        "Upload failed. Please try again.\n\n" +
          (err?.message || "Unknown error")
      );
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const handleJobStarted = (jobId: string) => {
    setImageSearchJobId(jobId);
    setImageSearchResults([]);
    setImageSearchError(null);
    setImageSearchLoading(true);

    if (imageSearchPollRef.current) clearInterval(imageSearchPollRef.current);

    imageSearchPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/image-search/status?jobId=${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        const incoming: LiveProduct[] = data.products ?? [];
        if (incoming.length > 0) setImageSearchResults(incoming);

        if (data.status === "done") {
          if (imageSearchPollRef.current) clearInterval(imageSearchPollRef.current);
          setImageSearchLoading(false);
          if (incoming.length === 0) {
            setImageSearchError("আপনার দেওয়া ছবির সাথে কোনো প্রোডাক্টের মিল পাওয়া যাচ্ছে না।");
          }
        } else if (data.status === "error") {
          if (imageSearchPollRef.current) clearInterval(imageSearchPollRef.current);
          setImageSearchLoading(false);
          setImageSearchError(data.error || "সার্চ ব্যর্থ হয়েছে।");
        }
      } catch (err) { console.warn("Poll error:", err); }
    }, 2000);
  };

  const clearImageSearch = () => {
    if (imageSearchPollRef.current) clearInterval(imageSearchPollRef.current);
    setImageSearchJobId(null);
    setImageSearchResults([]);
    setImageSearchError(null);
    setImageSearchLoading(false);
  };

  const addProductFromImageSearch = (p: LiveProduct) => {
    setItems((prev) => [
      ...prev,
      { title: p.title, price: p.price, quantity: 1, image: p.image, variant: "" },
    ]);
  };

  useEffect(() => {
    return () => {
      if (imageSearchPollRef.current) clearInterval(imageSearchPollRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Customer name is required");
    if (!phone.trim()) return setError("Customer phone is required");
    if (!address.trim()) return setError("Address is required");
    if (!email.trim()) return setError("Email is required for order tracking");
    if (items.length === 0) return setError("Add at least one item");
    if (items.some((it) => !it.title.trim())) {
      return setError("All items must have a name");
    }
    if (items.some((it) => it.price < 0 || it.quantity < 1)) {
      return setError("Item price and quantity must be valid");
    }

    setSaving(true);

    try {
      const orderId = await generateUniqueOrderId();
      const paymentLabel = PAYMENT_METHODS.find((p) => p.id === payment)?.label ?? "COD";

      const mappedItems = items.map((it) => {
        const base: Record<string, unknown> = {
          productId: `manual-${it.title.slice(0, 20)}`,
          colorId: "default",
          quantity: it.quantity,
          price: it.price,
          title: it.title,
          isLive: false,
        };
        const img = (it.image ?? "").trim();
        const vr = (it.variant ?? "").trim();
        if (img) base.image = img;
        if (vr) base.variant = vr;
        return base;
      });

      const orderDoc: Record<string, unknown> = {
        id: orderId,
        userId: foundUser?.uid ?? "admin-manual",
        userPhone: phone.trim(),
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
        status: "placed",
        statusUpdatedAt: serverTimestamp(),
        items: mappedItems,
        subtotal,
        shipping: shipping || 0,
        total,
        paidAmount: 0,
        dueAmount: total,
        payments: [],
        paymentMethod: paymentLabel,
        address: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          district: district.trim(),
          email: email.trim(),
        },
        adminNotes: notes.trim(),
      };

      if (selectedServices.length > 0) {
        orderDoc.selectedServices = selectedServices;
      }

      await setDoc(doc(db, "orders", orderId), orderDoc);

      const orderForEmail: Order = {
        id: orderId,
        userId: foundUser?.uid ?? "admin-manual",
        userPhone: phone.trim(),
        createdAt: Date.now(),
        items: mappedItems as any,
        subtotal,
        shipping: shipping || 0,
        total,
        paymentMethod: paymentLabel,
        status: "placed",
        address: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          district: district.trim(),
          email: email.trim(),
        },
        selectedServices: selectedServices,
      };

      sendOrderEmail(orderForEmail).catch(err => console.error("Email failed:", err));

      router.push(`/admin-panel/orders/${orderId}`);
    } catch (err: any) {
      console.error("Failed to create order:", err);
      setError(err?.message ?? "Failed to create order");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin-panel/orders")}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-gold-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Orders
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Manual Order
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Create Order
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Add an order received by phone, WhatsApp, or in person.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
              Customer Information
            </h2>
            {foundUser && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Existing Customer
              </span>
            )}
          </div>

          <div className="space-y-3 relative" ref={dropdownRef}>
            
            {/* ✅ FIX: Unified Search Bar (Phone or Name) */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Search Customer (Type Name or Phone) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (foundUser) clearUser(); // Clear found user if they start typing again
                  }}
                  placeholder="01XXXXXXXXX or John Doe..."
                  className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
                />
                
                {lookingUp && (
                  <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
                )}

                {/* ✅ FIX: Live Autocomplete Dropdown */}
                {showDropdown && searchResults.length > 0 && !foundUser && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border-subtle bg-white shadow-lg">
                    {searchResults.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => selectUser(u)}
                        className="flex w-full flex-col border-b border-border-subtle px-3 py-2 text-left transition hover:bg-bg-orange last:border-b-0"
                      >
                        <span className="text-sm font-semibold text-text-primary">
                          {u.name || "Unknown Name"}
                        </span>
                        <span className="text-xs text-text-muted">
                          {u.phone || "No phone"} • {u.email || "No email"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {foundUser && (
              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                <div className="text-xs">
                  <span className="font-semibold text-success">✓ Found: </span>
                  <span className="text-text-primary">
                    {foundUser.name || "—"}
                    {foundUser.email && !foundUser.email.endsWith("@chinadailybazar.app")
                      ? ` (${foundUser.email})`
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearUser}
                  className="text-[11px] font-semibold text-red-primary underline"
                >
                  Clear
                </button>
              </div>
            )}

            <Field
              label="Full Name *"
              value={name}
              onChange={(v) => {
                setName(v);
                if (foundUser) clearUser(); // Clear if editing
              }}
              placeholder="Customer's name"
            />

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Email Address (For Order Tracking) *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Full Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, road, area..."
                rows={3}
                className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
            </div>

            <Field
              label="District"
              value={district}
              onChange={setDistrict}
              placeholder="e.g. Dhaka"
            />
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
              Items
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImageSearchOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border-2 border-gold-primary bg-white px-3 py-1.5 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Search by Image
              </button>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg border border-gold-primary bg-white px-3 py-1.5 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange"
              >
                + Add Item
              </button>
            </div>
          </div>

          {imageSearchJobId && (
            <div className="mb-4 rounded-lg border-2 border-gold-primary/40 bg-bg-orange p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-gold-primary">
                  {imageSearchLoading
                    ? `Searching... ${imageSearchResults.length} result${
                        imageSearchResults.length === 1 ? "" : "s"
                      } found`
                    : imageSearchResults.length > 0
                    ? `Found ${imageSearchResults.length} product${
                        imageSearchResults.length === 1 ? "" : "s"
                      } — click to add`
                    : "No matches found"}
                </p>
                <button
                  type="button"
                  onClick={clearImageSearch}
                  className="text-[11px] font-semibold text-red-primary underline"
                >
                  Clear
                </button>
              </div>

              {imageSearchLoading && imageSearchResults.length === 0 && (
                <div className="flex items-center gap-2 py-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
                  <span className="text-xs text-text-muted">
                    Searching 1688 with your photo...
                  </span>
                </div>
              )}

              {imageSearchError && (
                <p className="text-xs text-red-primary">{imageSearchError}</p>
              )}

              {imageSearchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {imageSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addProductFromImageSearch(p);
                        clearImageSearch();
                      }}
                      className="flex flex-col overflow-hidden rounded-lg border-2 border-border-subtle bg-white text-left transition hover:border-gold-primary"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-bg-input">
                        {p.image && (
                          <img
                            src={p.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-2 text-[10px] font-medium text-text-primary">
                          {p.title}
                        </p>
                        <p className="mt-1 text-xs font-bold text-red-primary">
                          {formatBDT(p.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border-subtle bg-bg-input p-3"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id={`item-photo-${idx}`}
                      className="sr-only"
                      onChange={(e) => handleUploadPhoto(idx, e)}
                      disabled={uploadingIndex === idx}
                    />
                    <label
                      htmlFor={`item-photo-${idx}`}
                      className={`relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition ${
                        item.image
                          ? "border-success bg-white"
                          : "border-border-subtle bg-white hover:border-gold-primary"
                      }`}
                    >
                      {uploadingIndex === idx ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
                      ) : item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span className="mt-1 text-[9px] text-text-muted">
                            Photo
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Product name *
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateItem(idx, { title: e.target.value })
                      }
                      placeholder="e.g. Zircon Ring Set"
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Price (৳)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.price || ""}
                      onChange={(e) =>
                        updateItem(idx, {
                          price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity || 1}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Variant
                    </label>
                    <input
                      type="text"
                      value={item.variant}
                      onChange={(e) =>
                        updateItem(idx, { variant: e.target.value })
                      }
                      placeholder="e.g. Red / XL, 64GB"
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="flex h-9 w-full items-center justify-center rounded border border-red-primary/30 text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VALUE ADDED SERVICES */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Value Added Services
          </h2>
          <div className="space-y-2">
            {AVAILABLE_SERVICES.map((service) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                    isSelected ? "border-gold-primary bg-bg-orange" : "border-border-subtle bg-white hover:border-gold-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? "border-gold-primary bg-gold-primary text-white" : "border-border-subtle bg-white"}`}>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{service.name}</p>
                      <p className="text-[11px] text-text-muted">Reduce risk before shipping</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-primary">{formatBDT(service.price)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Payment & Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Payment Method
              </label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Shipping (৳)
              </label>
              <input
                type="number"
                min={0}
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="text-text-primary">{formatBDT(subtotal)}</span>
            </div>
            {selectedServices.length > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Services</span>
                <span className="text-text-primary">{formatBDT(servicesTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <span>Shipping</span>
              <span className="text-text-primary">
                {formatBDT(shipping || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-2">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-lg font-bold text-red-primary">
                {formatBDT(total)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Admin Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes (customer will not see this)"
            rows={3}
            className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
          />
        </section>

        {error && (
          <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin-panel/orders")}
            className="flex-1 rounded-lg border border-border-subtle bg-white py-3 text-sm font-semibold text-text-secondary transition hover:border-red-primary hover:text-red-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>

      <ImageSearchModal
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        onJobStarted={handleJobStarted}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}