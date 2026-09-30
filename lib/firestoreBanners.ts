// lib/firestoreBanners.ts
// Firestore CRUD for homepage banners

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  textPosition: "left" | "right" | "center";
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const COLLECTION = "banners";

export async function getAllBanners(): Promise<Banner[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<Banner, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching banners:", err);
    return [];
  }
}

export async function getBanner(id: string): Promise<Banner | null> {
  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<Banner, "id">;
    return { ...data, id: snap.id };
  } catch (err) {
    console.error("Error fetching banner:", err);
    return null;
  }
}

export async function saveBanner(banner: Omit<Banner, "id"> & { id?: string }): Promise<string> {
  const colRef = collection(db, COLLECTION);

  if (banner.id) {
    const ref = doc(db, COLLECTION, banner.id);
    const { id, ...data } = banner;
    await setDoc(
      ref,
      { ...data, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return banner.id;
  }

  const newRef = doc(colRef);
  const { id, ...data } = banner;
  await setDoc(newRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function updateBannerFields(
  id: string,
  fields: Partial<Banner>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}