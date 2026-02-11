// skyColor.ts
export type Rgb = [number, number, number];
export type Oklab = [number, number, number];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const srgbToLinear = (value: number) => {
  if (value <= 0.04045) return value / 12.92;
  return Math.pow((value + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (value: number) => {
  if (value <= 0.0031308) return value * 12.92;
  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
};

export const rgbToOklab = (rgb: Rgb): Oklab => {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return [
    0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  ];
};

export const oklabToRgb = (lab: Oklab): Rgb => {
  const l = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
  const m = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
  const s = lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2];

  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return [
    clamp(linearToSrgb(r)),
    clamp(linearToSrgb(g)),
    clamp(linearToSrgb(b))
  ];
};

export const mixOklab = (a: Rgb, b: Rgb, t: number): Rgb => {
  const la = rgbToOklab(a);
  const lb = rgbToOklab(b);
  const mix: Oklab = [
    la[0] + (lb[0] - la[0]) * t,
    la[1] + (lb[1] - la[1]) * t,
    la[2] + (lb[2] - la[2]) * t
  ];
  return oklabToRgb(mix);
};

export const adjustOklab = (
  rgb: Rgb,
  deltaL: number,
  saturationScale: number
): Rgb => {
  const lab = rgbToOklab(rgb);
  const adjusted: Oklab = [
    clamp(lab[0] + deltaL, 0, 1),
    lab[1] * saturationScale,
    lab[2] * saturationScale
  ];
  return oklabToRgb(adjusted);
};

export const clampRgb = (rgb: Rgb): Rgb => [
  clamp(rgb[0]),
  clamp(rgb[1]),
  clamp(rgb[2])
];

// Optimized for high-frequency calls
export const toCssRgb = (rgb: Rgb, alpha = 1) => {
  // Bitwise OR 0 is slightly faster than Math.floor for positive numbers
  const r = (clamp(rgb[0]) * 255) | 0;
  const g = (clamp(rgb[1]) * 255) | 0;
  const b = (clamp(rgb[2]) * 255) | 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};