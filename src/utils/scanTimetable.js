import { binarize, extractTimetable } from './timetableLayout';

const MAX_SOURCE_WIDTH = 3000;

// Draws an uploaded image file to pixels, shrinking very large screenshots
async function readPixels(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file couldn't be opened as an image. Please upload a PNG or JPG screenshot.");
  }
  const shrink = Math.min(1, MAX_SOURCE_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * shrink);
  canvas.height = Math.round(bitmap.height * shrink);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function toCanvas(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  return canvas;
}

// Reads a VIT timetable screenshot and returns { classes, cellCount }.
// onProgress gets a number from 0 to 100. Throws an Error with a readable
// message when the image can't be read as a timetable.
export async function scanTimetableImage(file, onProgress = () => {}) {
  onProgress(2);
  const image = await readPixels(file);
  // OCR reads small table text much better when it is enlarged
  const scale = Math.max(1, Math.min(4, 3000 / image.width));
  const cleaned = toCanvas(binarize(image, scale));
  onProgress(8);

  // Loaded on demand: the OCR engine is large and only needed here
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'loading language traineddata') onProgress(8 + m.progress * 20);
      if (m.status === 'recognizing text') onProgress(30 + m.progress * 65);
    },
  });
  let data;
  try {
    ({ data } = await worker.recognize(cleaned, {}, { blocks: true }));
  } finally {
    await worker.terminate();
  }

  const words = [];
  for (const block of data.blocks || []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const w of line.words) {
          words.push({
            text: w.text,
            bbox: { x0: w.bbox.x0 / scale, y0: w.bbox.y0 / scale, x1: w.bbox.x1 / scale, y1: w.bbox.y1 / scale },
          });
        }
      }
    }
  }
  const result = extractTimetable(image, words);
  onProgress(100);
  return result;
}
