# ssim-grey

Fast SSIM (Structural Similarity Index) for single-channel greyscale images. Zero dependencies.

## Why

[ssim.js](https://github.com/obartra/ssim) is excellent but requires RGBA input. If your images are already greyscale (confusable detection, OCR diffing, medical imaging), you pay for a 4x memory expansion and a per-pixel greyscale conversion that produces the same values you started with.

`ssim-grey` operates directly on single-channel buffers. Same algorithm, same results, less overhead.

## Install

```bash
npm install ssim-grey
```

## Usage

```typescript
import { ssimGrey } from 'ssim-grey';

// Two 48x48 greyscale images as Uint8Array or Buffer
const score = ssimGrey(img1, img2, 48, 48);
// => 0.762995 (range: -1 to 1, where 1 = identical)
```

### Options

```typescript
ssimGrey(img1, img2, width, height, {
  windowSize: 11,  // sliding window size (default 11)
  k1: 0.01,        // first stability constant (default 0.01)
  k2: 0.03,        // second stability constant (default 0.03)
  bitDepth: 8,     // pixel bit depth (default 8, i.e. 0-255)
});
```

## Algorithm

Implements Wang et al. (2004) SSIM with a uniform box filter and summed area tables, matching the `weber` algorithm from ssim.js. O(width * height) regardless of window size.

## Validation

Cross-validated against ssim.js on 30 real image pairs from [confusable-vision](https://github.com/paultendo/confusable-vision). Max absolute delta: 0.000001.

## License

MIT
