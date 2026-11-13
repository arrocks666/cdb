// lib/resizeImage.ts
export async function resizeImage(
  file: File,
  maxSize: number = 512,
  quality: number = 0.85
): Promise<File> {
  if (file.type === "image/svg+xml") return file;

  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
  const isSmall = file.size < 500 * 1024; // 500KB limit

  // ✅ Skip processing if it's a small JPG (Uploads instantly)
  if (isJpeg && isSmall) {
    return file; 
  }

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

        // ✅ Flatten PNG transparency to a solid white background
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