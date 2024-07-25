"use client";
import { useState } from "react";
import { genFullGCode } from "./generator/gen-gcode";
import { SVGRouter, getPathData } from "./svgs";
import { convertColorEntryToSwatchInput, hexToHSL, hslToHex } from "./utils";
import { guessColorName } from "./color-guesser";

export interface ColorEntry {
  color: HSLColor;
  svgIdentifier: string;
  name: string | undefined;
  amount: 0 | 1 | 2;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export default function Home() {
  const [svgContents, setSvgContents] = useState<string>("");
  const [colors, setColors] = useState<ColorEntry[]>([]);

  fetch("/drawing4.svg")
    .then((response) => response.text())
    .then((d) => {
      setSvgContents(d);
      console.log(
        genFullGCode([
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0, 0.3, 0.7, 0, 0], //purple
          },
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0.1, 0.45, 0.45, 0, 0], //purple
          },
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0.2, 0.6, 0.2, 0, 0], //purple
          },
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0.3, 0.35, 0.35, 0, 0], //purple
          },
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0.5, 0.2, 0.3, 0, 0], //purple
          },
          {
            raw_svg_contents: d,
            length_percentage: 1,
            color_percentages: [0.7, 0.3, 0.0, 0, 0], //purple
          }
        ])
      );
    });

  const handleColorPickerChange = (index: number, value: string) => {
    const hslColor = hexToHSL(value);
    setColors((colors) =>
      colors.map((c, i) => {
        if (i === index) {
          const updatedName =
            c.name !== guessColorName(hslToHex(c.color))
              ? c.name
              : guessColorName(hslToHex(hslColor));
          return {
            name: updatedName,
            svgIdentifier: c.svgIdentifier,
            color: hslColor,
            amount: c.amount,
          };
        }
        return c;
      })
    );
  };

  const handleRename = (index: number, value: string) => {
    setColors((colors) =>
      colors.map((c, i) => {
        if (i === index) {
          return { ...c, name: value };
        }
        return c;
      })
    );
  };

  const handleAmountChange = (index: number, amount: 0 | 1 | 2) => {
    setColors((colors) =>
      colors.map((c, i) => {
        if (i === index) {
          return { ...c, amount };
        }
        return c;
      })
    );
  };

  const addColor = () => {
    let c: HSLColor = { h: 0, s: 0, l: 0 };
    setColors((colors) => [
      ...colors,
      {
        color: c,
        amount: 1,
        name: guessColorName(hslToHex(c)),
        svgIdentifier: "diamond",
      },
    ]);
  };

  const sendToPalette = async () => {
    try {
      const swatchInputs = colors.map((c) => convertColorEntryToSwatchInput(c, svgContents));
      console.log("Swatch inputs:", swatchInputs);
  
      const gCode = genFullGCode(swatchInputs);
      console.log("Generated GCode:", gCode);
  
      const endpoint = "http://192.168.0.202/upload"; // Update to the ESP32's local IP address and the upload endpoint
  
      // Create text content from colors.map data (including SVG path data)
      const textContent = colors
        .map(
          (c) =>
            `Color: ${c.color}, SVG Identifier: ${c.svgIdentifier}, Name: ${c.name}, Path Data: ${getPathData(c.svgIdentifier)}`
        )
        .join("\n");
  
      console.log("Text content prepared:", textContent);
  
      // Send the request with the text content as plain text
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          'Content-Type': 'text/plain',
        },
        body: textContent,
      });
  
      if (response.ok) {
        console.log("File sent successfully");
        // Handle successful file transmission here
      } else {
        const errorText = await response.text();
        console.error("Failed to send file:", errorText);
        // Handle server errors here
      }
    } catch (error) {
      console.error("Error in sendToPalette:", error);
    }
  };
  

  const removeColor = (index: number) => {
    setColors((colors) => colors.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen bg-[#676767] p-4 overflow-x-clip">
      <div className="flex flex-col md:flex-row h-full md:items-start">
        <div className="bg-blue-50 p-2 rounded">
          <h1 className="text-2xl">
            Pick your{" "}
            <span className="text-[#ffb5e1]">
              <b>
                <i>Colors</i>
              </b>
            </span>
          </h1>
          <hr className="mb-2 mt-1 border-black/20" />
          <div className="flex flex-col items-center">
            <div className="flex flex-col space-y-4 items-stretch min-w-[300px]">
              {colors.map((c, i) => (
                <div className="flex justify-between items-center" key={i}>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => removeColor(i)}
                      className="text-red-500 w-4 text-xl mr-1"
                    >
                      ⊖
                    </button>
                    <div className="w-[200px]">
                      <input
                        className="w-full h-7 mb-1 pl-1"
                        value={c.name ?? `Color ${i + 1}`}
                        onChange={(e) => handleRename(i, e.target.value)}
                      ></input>
                      <div className="h-6 text-xs flex">
                        {[0, 1, 2].map((amount) => (
                          <button
                            key={amount}
                            onClick={() =>
                              handleAmountChange(i, amount as 0 | 1 | 2)
                            }
                            className={`h-full w-full border rounded text-center ${
                              amount == c.amount
                                ? "bg-blue-200"
                                : "bg-blue-200/10"
                            }`}
                          >
                            {Array(amount + 1)
                              .fill("o")
                              .join("")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4 h-12 w-[100px] relative">
                    <input
                      type="color"
                      className="h-full w-full"
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "",
                      }}
                      value={hslToHex(c.color)}
                      onChange={(e) =>
                        handleColorPickerChange(i, e.target.value)
                      }
                    />
                    {c.color.l < 5 && (
                      <div className="absolute pointer-events-none top-0 -left-4 w-full h-full flex items-center justify-center">
                        <div className="m-0 p-0 text-xs text-white text-center">
                          Tap to change color
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-col">
                <button
                  className="border border-black hover:bg-gray-100 px-2 py-1 font-semibold rounded mx-2 my-2"
                  onClick={addColor}
                >
                  ➕ Add Color
                </button>
                {colors.length > 0 && (
                  <button
                    className="flex items-center justify-center border bg-black hover:bg-gray-800 border-white text-white px-2 py-1 font-semibold rounded mx-2 mb-2"
                    onClick={sendToPalette}
                  >
                    <img
                      className="h-[20px] mr-2 mt-1"
                      src="plogo.png"
                      alt="logo"
                    />
                    Go
                  </button>
                )}

                {colors.length === 0 && (
                  <button
                    className="flex items-center justify-center border bg-black hover:bg-gray-800 border-white text-white px-2 py-1 font-semibold rounded mx-2 mb-2"
                    onClick={() => {
                      setColors(
                        [1, 2, 3, 4].map((i) => {
                          let color = {
                            h: Math.random() * 360,
                            s: Math.random() * 100,
                            l: Math.random() * 70 + 30,
                          };
                          return {
                            color,
                            svgIdentifier: "diamond",
                            name: guessColorName(hslToHex(color)),
                            amount: 1,
                          };
                        })
                      );
                    }}
                  >
                    Surpise me
                  </button>
                )}
                <p className="text-gray-500 mx-2 text-center">
                  {colors.length == 0
                    ? "Add a color to start building your color palette"
                    : "Add more colors to round out your palette"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:ml-4 mt-4 w-full">
          <Circle entries={colors} />
        </div>
      </div>
    </div>
  );
}

function Circle({ entries }: { entries: ColorEntry[] }) {
  let interval = entries.length <= 9 ? 40 : 360 / entries.length;
  return (
    <div className="relative w-full pt-[100%] pointer-events-none">
      <div className="absolute bg-white w-full h-full top-0 left-0 rounded-full"></div>
      <img
        className="absolute top-1/2 left-1/2 -ml-[26px] -mt-[30px] h-20  md:-ml-[36px] md:-mt-[56px] md:h-28"
        src="plogo.png"
        alt="logo"
      />
      {entries.map((e, i) => (
        <div
          key={i}
          className="absolute w-full h-full top-0 left-0"
          style={{ rotate: `${i * interval}deg` }}
        >
          <div
            className="absolute top-8 w-16 h-16"
            style={{
              left: "calc(50% - 32px)",
              scale: e.amount == 0 ? 0.75 : e.amount == 1 ? 1 : 1.25,
            }}
          >
            {e.svgIdentifier.length > 0 && (
              <SVGRouter
                svgIdentifier={e.svgIdentifier}
                color={hslToHex(e.color)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
