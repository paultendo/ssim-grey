/**
 * Self-test for ssim-grey. No external dependencies.
 *
 * Run: npm run build && npm run selftest
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ssimGrey } from './index.js';

describe('ssimGrey', () => {
  it('returns 1.0 for identical images', () => {
    const size = 48;
    const img = new Uint8Array(size * size);
    for (let i = 0; i < img.length; i++) img[i] = Math.floor(Math.random() * 256);

    const result = ssimGrey(img, img, size, size);
    assert.equal(result, 1.0);
  });

  it('returns 1.0 for two all-black images', () => {
    const size = 48;
    const img = new Uint8Array(size * size); // all zeros
    const result = ssimGrey(img, img, size, size);
    assert.equal(result, 1.0);
  });

  it('returns 1.0 for two all-white images', () => {
    const size = 48;
    const img = new Uint8Array(size * size).fill(255);
    const result = ssimGrey(img, img, size, size);
    assert.equal(result, 1.0);
  });

  it('returns low SSIM for inverted images', () => {
    const size = 48;
    const img1 = new Uint8Array(size * size);
    const img2 = new Uint8Array(size * size);
    // Gradient pattern
    for (let i = 0; i < img1.length; i++) {
      img1[i] = Math.floor((i / img1.length) * 255);
      img2[i] = 255 - img1[i]!;
    }

    const result = ssimGrey(img1, img2, size, size);
    assert.ok(result < 0.1, `Expected low SSIM for inverted images, got ${result}`);
  });

  it('returns high SSIM for slightly noisy copy', () => {
    const size = 48;
    const img1 = new Uint8Array(size * size);
    const img2 = new Uint8Array(size * size);
    for (let i = 0; i < img1.length; i++) {
      const v = Math.floor(Math.random() * 256);
      img1[i] = v;
      // Add small noise (up to +/- 5)
      img2[i] = Math.min(255, Math.max(0, v + Math.floor(Math.random() * 11) - 5));
    }

    const result = ssimGrey(img1, img2, size, size);
    assert.ok(result > 0.9, `Expected high SSIM for noisy copy, got ${result}`);
  });

  it('returns 1 for images smaller than window size', () => {
    const img = new Uint8Array(5 * 5).fill(128);
    const result = ssimGrey(img, img, 5, 5);
    assert.equal(result, 1);
  });

  it('is symmetric: ssim(a,b) === ssim(b,a)', () => {
    const size = 48;
    const img1 = new Uint8Array(size * size);
    const img2 = new Uint8Array(size * size);
    for (let i = 0; i < img1.length; i++) {
      img1[i] = Math.floor(Math.random() * 256);
      img2[i] = Math.floor(Math.random() * 256);
    }

    const ab = ssimGrey(img1, img2, size, size);
    const ba = ssimGrey(img2, img1, size, size);
    assert.equal(ab, ba);
  });

  it('handles non-square images', () => {
    const w = 64, h = 32;
    const img = new Uint8Array(w * h);
    for (let i = 0; i < img.length; i++) img[i] = Math.floor(Math.random() * 256);

    const result = ssimGrey(img, img, w, h);
    assert.equal(result, 1.0);
  });
});
