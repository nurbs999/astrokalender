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

// DIN A3 Format: 420 × 297 mm -> Seitenverhältnis √2 ≈ 1.41421356 (1:1,4142)
// Bei maximal 1920 Pixel in der Breite: 1920 / 1.41421356 ≈ 1358 Pixel in der Höhe
export const DINA3_ASPECT_RATIO = 1.41421356;
export const DINA3_MAX_WIDTH = 1920;
export const DINA3_MAX_HEIGHT = Math.round(1920 / DINA3_ASPECT_RATIO); // 1358 px

/**
 * Resizes and compresses an image file in the browser before upload.
 * - Target Max: DIN A3 (1920 × 1358 px bei 1:1,4142), proportional containment preserving original aspect ratio
 * - Output: image/jpeg at quality 0.85
 */
export async function compressImage(
  file: File,
  maxWidth = DINA3_MAX_WIDTH,
  maxHeight = DINA3_MAX_HEIGHT,
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

        // Bounding Box für DIN A3 Limit (Querformat: max 1920 x 1358, Hochformat: max 1358 x 1920)
        const isPortrait = originalHeight > originalWidth;
        const limitWidth = isPortrait ? maxHeight : maxWidth;
        const limitHeight = isPortrait ? maxWidth : maxHeight;

        // Proportionale Skalierung: Das Bildverhältnis wird immer strikt beibehalten (keine Verzerrung, kein Upscaling)
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (originalWidth > limitWidth || originalHeight > limitHeight) {
          const ratio = Math.min(limitWidth / originalWidth, limitHeight / originalHeight);
          targetWidth = Math.round(originalWidth * ratio);
          targetHeight = Math.round(originalHeight * ratio);
        }

        // Sicherstellen, dass Maße gültig sind
        targetWidth = Math.max(1, targetWidth);
        targetHeight = Math.max(1, targetHeight);

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

        // Draw image resized while strictly respecting aspect ratio
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

