// lib/resizeImage.ts
// Browser-side image resizing before upload.
// Prevents "file too large" errors AND fixes PNG transparency issues.

/**
 * Resize an image File to a target maximum dimension.
 * Returns a new File (JPEG, compressed) ready to upload.
 */
export async function resizeImage(
  file: File,
  maxSize: number = 512,
  quality: number = 0.85
): Promise<File> {
  // SVG is vector — don't rasterize
  if (file.type === "image/svg+xml") return file;

  // ❌ REMOVED THE "SKIP IF SMALL" LINE HERE
  // We MUST process every file through the canvas to ensure it becomes a valid JPG.

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // ✅ FIX: White background (PNG transparency → solid white)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            const resized = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, "") + ".jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );
            resolve(resized);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convenience — resize then return data URL (for previews).
 */
export async function resizeImageToDataUrl(
  file: File,
  maxSize: number = 512,
  quality: number = 0.85
): Promise<string> {
  const resized = await resizeImage(file, maxSize, quality);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(resized);
  });
}