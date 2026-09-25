import * as fs from "fs";
import * as path from "path";

const filePath = path.join(process.cwd(), "data", "products.json");
const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));

let fixed = 0;

for (const p of products) {
  if (p.image && typeof p.image === "string") {
    const original = p.image;
    p.image = p.image.replace(/_500x500/g, "");
    if (p.image !== original) fixed++;
  }
  if (Array.isArray(p.gallery)) {
    p.gallery = p.gallery.map((g: string) => {
      if (typeof g === "string") {
        return g.replace(/_500x500/g, "");
      }
      return g;
    });
  }
}

fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
console.log(`Fixed ${fixed} image URLs`);