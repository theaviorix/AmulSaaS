// Client-side export helpers — no backend, so "downloads" are generated
// entirely in the browser via Blob + an anchor click.

import { jsPDF } from 'jspdf';

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

// Renders the same "rows" shape used for CSV exports (array of arrays —
// some rows are section headers with a single cell, some are blank
// spacers, most are aligned data rows) as a simple paginated PDF.
export function downloadPDF(filename, rows, options) {
  const title = options && options.title;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  let y = 48;

  const ensureRoom = (needed) => {
    if (y + (needed || 16) > pageHeight - 40) {
      doc.addPage();
      y = 48;
    }
  };

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, marginX, y);
    y += 22;
    doc.setDrawColor(210);
    doc.line(marginX, y - 8, pageWidth - marginX, y - 8);
  }

  rows.forEach((row) => {
    if (!row || row.length === 0) {
      y += 8;
      return;
    }
    const isSectionHeader = row.length === 1;
    const text = row.map((c) => (c === null || c === undefined ? '' : String(c))).join('   ·   ');
    doc.setFont('helvetica', isSectionHeader ? 'bold' : 'normal');
    doc.setFontSize(isSectionHeader ? 11.5 : 9.5);
    const lineHeight = isSectionHeader ? 18 : 14;
    const wrapped = doc.splitTextToSize(text, maxWidth);
    if (isSectionHeader) y += 6; // a little breathing room before a new section
    wrapped.forEach((line) => {
      ensureRoom(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  });

  doc.save(filename.endsWith('.pdf') ? filename : filename + '.pdf');
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(filename, blob);
}

// Resize + compress an uploaded image file down to a small square-ish JPEG
// data URL, so profile pictures don't blow up localStorage quota.
export function compressImageFile(file, maxSize, quality) {
  maxSize = maxSize || 320;
  quality = quality === undefined ? 0.82 : quality;
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
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
