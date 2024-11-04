export function guessColorName(hex: string): string {
  const colors: { [key: string]: string } = {
    "#FF0000": "Red",
    "#00FF00": "Green",
    "#0000FF": "Blue",
    "#FFFF00": "Yellow",
    "#FFA500": "Orange",
    "#800080": "Purple",
    "#00FFFF": "Cyan",
    "#FFC0CB": "Pink",
    "#A52A2A": "Brown",
    "#808080": "Gray",
    "#000000": "Black",
    "#FFFFFF": "White",
    "#8B0000": "Dark Red",
    "#ADFF2F": "Green Yellow",
    "#7FFF00": "Chartreuse",
    "#7FFFD4": "Aquamarine",
    "#DC143C": "Crimson",
    "#00CED1": "Dark Turquoise",
    "#9400D3": "Dark Violet",
    "#FF1493": "Deep Pink",
    "#00BFFF": "Deep Sky Blue",
    "#696969": "Dim Gray",
    "#1E90FF": "Dodger Blue",
    "#B22222": "Fire Brick",
    "#FFFAF0": "Floral White",
    "#228B22": "Forest Green",
    "#DCDCDC": "Gainsboro",
    "#F8F8FF": "Ghost White",
    "#FFD700": "Gold",
    "#F0FFF0": "Honey Dew",
    "#FF69B4": "Hot Pink",
    "#4B0082": "Indigo",
    "#FFFFF0": "Ivory",
    "#F0E68C": "Khaki",
    "#E6E6FA": "Lavender",
    "#FFF0F5": "Lavender Blush",
    "#7CFC00": "Lawn Green",
    "#FFFACD": "Lemon Chiffon",
    "#ADD8E6": "Light Blue",
    "#F08080": "Light Coral",
    "#E0FFFF": "Light Cyan",
    "#D3D3D3": "Light Gray",
    "#90EE90": "Light Green",
    "#FFB6C1": "Light Pink",
    "#FFA07A": "Light Salmon",
    "#20B2AA": "Light Sea Green",
    "#87CEFA": "Light Sky Blue",
    "#778899": "Light Slate Gray",
    "#B0C4DE": "Light Steel Blue",
    "#FFFFE0": "Light Yellow",
    "#32CD32": "Lime Green",
    "#FAF0E6": "Linen",
    "#800000": "Maroon",
    "#66CDAA": "Medium Aqua Marine",
    "#0000CD": "Medium Blue",
    "#BA55D3": "Medium Orchid",
    "#9370DB": "Medium Purple",
    "#3CB371": "Medium Sea Green",
    "#7B68EE": "Medium Slate Blue",
    "#00FA9A": "Medium Spring Green",
    "#48D1CC": "Medium Turquoise",
    "#C71585": "Medium Violet Red",
    "#191970": "Midnight Blue",
    "#F5FFFA": "Mint Cream",
    "#FFE4E1": "Misty Rose",
    "#FFE4B5": "Moccasin",
    "#FFDEAD": "Navajo White",
    "#000080": "Navy",
    "#FDF5E6": "Old Lace",
    "#808000": "Olive",
    "#6B8E23": "Olive Drab",
    "#FF4500": "Orange Red",
    "#DA70D6": "Orchid",
    "#98FB98": "Pale Green",
    "#AFEEEE": "Pale Turquoise",
    "#DB7093": "Pale Violet Red",
    "#FFEFD5": "Papaya Whip",
    "#FFDAB9": "Peach Puff",
    "#CD853F": "Peru",
    "#DDA0DD": "Plum",
    "#B0E0E6": "Powder Blue",
    "#BC8F8F": "Rosy Brown",
    "#4169E1": "Royal Blue",
    "#8B4513": "Saddle Brown",
    "#FA8072": "Salmon",
    "#F4A460": "Sandy Brown",
    "#2E8B57": "Sea Green",
    "#FFF5EE": "Sea Shell",
    "#A0522D": "Sienna",
    "#C0C0C0": "Silver",
    "#87CEEB": "Sky Blue",
    "#6A5ACD": "Slate Blue",
    "#708090": "Slate Gray",
    "#FFFAFA": "Snow",
    "#00FF7F": "Spring Green",
    "#4682B4": "Steel Blue",
    "#D2B48C": "Tan",
    "#D8BFD8": "Thistle",
    "#FF6347": "Tomato",
    "#40E0D0": "Turquoise",
    "#EE82EE": "Violet",
    "#F5DEB3": "Wheat",
    "#F5F5F5": "White Smoke",
    "#9ACD32": "Yellow Green",
  };

  // Normalize the hex string to uppercase
  hex = hex.toUpperCase();

  // Check if the color is in the predefined list
  if (colors[hex]) {
    return colors[hex];
  }

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  // Calculate the distance between two colors
  const colorDistance = (rgb1: number[], rgb2: number[]) => {
    return Math.sqrt(
      Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2)
    );
  };

  const targetRgb = hexToRgb(hex);
  let closestColor = "Unknown Color";
  let minDistance = Infinity;

  for (const [colorHex, colorName] of Object.entries(colors)) {
    const distance = colorDistance(targetRgb, hexToRgb(colorHex));
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorName;
    }
  }

  return closestColor;
}
