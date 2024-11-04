import { SwatchInput } from "./generator/gen-gcode";
import { ColorEntry, HSLColor } from "./App";

interface CMYKWColor {
  c: number;
  m: number;
  y: number;
  k: number;
  w: number;
}

export function hslToHex(color: HSLColor): string {
  let { h, s, l } = color;
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  // Convert RGB to HEX
  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

// Helper function to convert HEX to HSL
export const hexToHSL = (hex: string): HSLColor => {
  // Ensure the hex string is properly formatted and convert it to RGB
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  // Find the maximum and minimum values among R, G, and B
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h: number, s: number, l: number;
  h = 0;

  // Calculate luminance
  l = (max + min) / 2;

  if (max === min) {
    // Achromatic case (when max and min are equal, hue and saturation are zero)
    h = s = 0;
  } else {
    let d = max - min;
    // Calculate saturation
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    // Calculate hue
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Convert the results to the HSLColor type
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

function hslToRGB(color: HSLColor): { r: number; g: number; b: number } {
  let { h, s, l } = color;
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hslToCMYKW(color: HSLColor): CMYKWColor {
  const { r, g, b } = hslToRGB(color);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let k = 1 - max / 255;
  // const c = (1 - r / 255 - k) / (1 - k);
  // const m = (1 - g / 255 - k) / (1 - k);
  // const y = (1 - b / 255 - k) / (1 - k);
  let c = (1 - r / 255);
  let m = (1 - g / 255);
  let y = (1 - b / 255);
  let w = min / 255;

  let threshold = 0.05;
  if(c<threshold){
    c = 0;
  }
  if(m<threshold){
    m = 0;
  }
  if(y<threshold){
    y = 0;
  }
  if(w<threshold){
    w = 0;
  }
  let sum = c + m + y + w;

  c = c/sum;
  m = m/sum;
  y = y/sum;
  w = w/sum;
  k = 0;
  return { c, m, y, k, w };
}

export function hexToCMYKW(hex: string): CMYKWColor {
  const hslColor = hexToHSL(hex);
  return hslToCMYKW(hslColor);
}

export function convertColorEntryToSwatchInput(
  colorEntry: ColorEntry,
  svgContents: string,
  row: number
): SwatchInput {
  let length_percentage = 0;
  switch (colorEntry.amount) {
    case 0:
      length_percentage = 0.2;
      break;
    case 1:
      length_percentage = 0.6;
      break;
    case 2:
      length_percentage = 0.8;
      break;
  }
  const cmykw = hslToCMYKW(colorEntry.color)
  return {
    color_percentages: [cmykw.m, cmykw.c, cmykw.w, cmykw.y, 0], //magenta, cyan, white, yellow
    raw_svg_contents: svgContents,
    length_percentage: length_percentage,
    row: row,
  };
}