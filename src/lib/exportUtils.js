// Client-side export helpers — no backend, so "downloads" are generated
// entirely in the browser via Blob + an anchor click.

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(val) {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCSV(rows) {
  // rows: array of arrays (first row = header)
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

export function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  // BOM so Excel opens UTF-8 (₹ symbol) correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename.endsWith('.csv') ? filename : filename + '.csv', blob);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(filename, blob);
}

// Resize + compress an uploaded image file down to a small square-ish JPEG
// data URL, so profile pictures don't blow up localStorage quota.
export function compressImageFile(file, maxSize = 320, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height); height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
