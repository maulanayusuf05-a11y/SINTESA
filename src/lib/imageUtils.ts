/**
 * Mengompres file gambar logo sekolah di sisi klien (max 256x256 px)
 * agar ukuran Base64 aman disimpan di localStorage dan database Supabase.
 */
export const compressLogoImage = (file: File, maxSize = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (PNG, JPG, SVG, atau WEBP).'));
      return;
    }

    // SVG tidak perlu di-rasterisasi jika ukurannya kecil
    if (file.type === 'image/svg+xml' && file.size <= 100 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Gagal membaca file SVG.'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file SVG.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Gagal membaca file gambar.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Gunakan PNG untuk menjaga transparansi logo sekolah; fallback webp/jpeg bila terlalu besar
        let output = canvas.toDataURL('image/png');
        if (output.length > 90 * 1024) {
          output = canvas.toDataURL('image/webp', 0.85);
        }
        resolve(output);
      };
      img.onerror = () => reject(new Error('Format gambar tidak valid atau rusak.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
};
