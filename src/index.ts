/**
 * ssim-grey: Fast SSIM for single-channel greyscale images.
 *
 * Matches ssim.js's "weber" algorithm (uniform box filter, summed area tables)
 * but skips the RGBA expansion and greyscale conversion. For images that are
 * already greyscale (confusable detection, OCR, image diff), this eliminates
 * 4x memory overhead and redundant per-pixel work.
 *
 * Reference: Z. Wang, A.C. Bovik, H.R. Sheikh, E.P. Simoncelli,
 * "Image quality assessment: from error visibility to structural similarity",
 * IEEE Transactions on Image Processing, 2004.
 */

export interface SsimGreyOptions {
  /** Sliding window size (default 11, matching ssim.js). */
  windowSize?: number;
  /** First stability constant multiplier (default 0.01). */
  k1?: number;
  /** Second stability constant multiplier (default 0.03). */
  k2?: number;
  /** Bit depth of pixel values (default 8, i.e. 0-255). */
  bitDepth?: number;
}

/**
 * Compute Mean SSIM between two single-channel greyscale images.
 *
 * Uses a uniform box filter with summed area tables for O(width*height)
 * computation regardless of window size. Both images must have the same
 * dimensions. Pixel values are expected to be integers in [0, 2^bitDepth - 1].
 *
 * @param img1 - First greyscale image (single-channel, values 0-255)
 * @param img2 - Second greyscale image (single-channel, values 0-255)
 * @param width - Image width
 * @param height - Image height
 * @param options - Optional SSIM parameters
 * @returns Mean SSIM (mssim) in range [-1, 1]
 */
export function ssimGrey(
  img1: Uint8Array | Buffer,
  img2: Uint8Array | Buffer,
  width: number,
  height: number,
  options?: SsimGreyOptions,
): number {
  const ws = options?.windowSize ?? 11;
  const k1 = options?.k1 ?? 0.01;
  const k2 = options?.k2 ?? 0.03;
  const bitDepth = options?.bitDepth ?? 8;

  const L = (1 << bitDepth) - 1;
  const c1 = k1 * L * (k1 * L);
  const c2 = k2 * L * (k2 * L);
  const wsSq = ws * ws;

  // Valid window region (no zero-padding, matches ssim.js 'valid' convolution)
  const winW = width - ws + 1;
  const winH = height - ws + 1;

  if (winW <= 0 || winH <= 0) return 1;

  // Build 5 summed area tables (SAT) in a single pass.
  // SAT[y][x] = sum of all pixel values in rect (0,0) to (x-1, y-1).
  // Dimensions: (width+1) x (height+1) with a zero border on top and left.
  const sw = width + 1;
  const satSize = sw * (height + 1);

  const satX = new Float64Array(satSize);
  const satY = new Float64Array(satSize);
  const satX2 = new Float64Array(satSize);
  const satY2 = new Float64Array(satSize);
  const satXY = new Float64Array(satSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = img1[y * width + x]!;
      const py = img2[y * width + x]!;

      const i = (y + 1) * sw + (x + 1);
      const above = i - sw;       // (y) * sw + (x+1)
      const left = i - 1;         // (y+1) * sw + x
      const aboveLeft = above - 1; // y * sw + x

      satX[i] = px + satX[above] + satX[left] - satX[aboveLeft];
      satY[i] = py + satY[above] + satY[left] - satY[aboveLeft];
      satX2[i] = px * px + satX2[above] + satX2[left] - satX2[aboveLeft];
      satY2[i] = py * py + satY2[above] + satY2[left] - satY2[aboveLeft];
      satXY[i] = px * py + satXY[above] + satXY[left] - satXY[aboveLeft];
    }
  }

  // Compute per-window SSIM and accumulate mean (Welford's online mean,
  // matching ssim.js's weber accumulation pattern).
  let mssim = 0;
  let count = 0;

  for (let wy = 0; wy < winH; wy++) {
    for (let wx = 0; wx < winW; wx++) {
      // Rectangle sum from (wx, wy) to (wx+ws-1, wy+ws-1) via SAT
      const tl = wy * sw + wx;
      const tr = wy * sw + (wx + ws);
      const bl = (wy + ws) * sw + wx;
      const br = (wy + ws) * sw + (wx + ws);

      const sX = satX[br] - satX[bl] - satX[tr] + satX[tl];
      const sY = satY[br] - satY[bl] - satY[tr] + satY[tl];

      const meanX = sX / wsSq;
      const meanY = sY / wsSq;

      const varX = (satX2[br] - satX2[bl] - satX2[tr] + satX2[tl]) / wsSq - meanX * meanX;
      const varY = (satY2[br] - satY2[bl] - satY2[tr] + satY2[tl]) / wsSq - meanY * meanY;
      const covXY = (satXY[br] - satXY[bl] - satXY[tr] + satXY[tl]) / wsSq - meanX * meanY;

      const num = (2 * meanX * meanY + c1) * (2 * covXY + c2);
      const den = (meanX * meanX + meanY * meanY + c1) * (varX + varY + c2);
      const val = num / den;

      // Welford's online mean (matches ssim.js weber accumulation)
      count++;
      mssim = mssim + (val - mssim) / count;
    }
  }

  return mssim;
}
