export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
  formattedOriginalSize: string;
  formattedCompressedSize: string;
  savingsPercent: number;
  compressionSummary: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Resizes and compresses an image file in the browser before upload.
 * - Target Max: 1920x1080 (contain, aspect ratio preserved)
 * - Output: image/jpeg at quality 0.85
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Originaldatei'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Konnte Bild nicht decodieren'));
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Calculate containment dimensions preserving aspect ratio
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
          targetWidth = Math.round(originalWidth * ratio);
          targetHeight = Math.round(originalHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D-Kontext konnte nicht erstellt werden'));
          return;
        }

        // High quality downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill background with black in case of transparency in PNG
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw image resized
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Kompression fehlgeschlagen'));
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const originalSize = file.size;
            const compressedSize = blob.size;
            const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

            const formattedOrig = formatBytes(originalSize);
            const formattedComp = formatBytes(compressedSize);
            const compressionSummary = `${formattedOrig} ➔ ${formattedComp} (-${savingsPercent}%)`;

            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              originalSize,
              compressedSize,
              originalWidth,
              originalHeight,
              compressedWidth: targetWidth,
              compressedHeight: targetHeight,
              formattedOriginalSize: formattedOrig,
              formattedCompressedSize: formattedComp,
              savingsPercent,
              compressionSummary
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

