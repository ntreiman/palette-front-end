"use client";
import { useState } from "react";
import { hexToHSL, hslToHex, hexToCMYKW } from "./utils";
import { SVGRouter, getPathData, convertPathToCoordinates, formatCoordinates } from "./svgs";


export interface ColorEntry {
  color: HSLColor;
  svgIdentifier: string;
  name: string | undefined;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export default function Home() {
  const [colors, setColors] = useState<ColorEntry[]>([
    {
      color: {
        h: 50,
        s: 80,
        l: 40,
      },
      name: undefined,
      svgIdentifier: "diamond",
    },
    {
      color: {
        h: 90,
        s: 70,
        l: 40,
      },
      name: undefined,
      svgIdentifier: "heart",
    },
  ]);

  const handleColorPickerChange = (index: number, value: string) => {
    const hslColor = hexToHSL(value);
    setColors((colors) =>
      colors.map((c, i) => {
        if (i === index) {
          return { ...c, color: hslColor };
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

  const addColor = () => {
    let c: HSLColor = { h: 0, s: 0, l: 0 };
    setColors((colors) => [
      ...colors,
      { color: c, name: undefined, svgIdentifier: "diamond" },
    ]);
  };

  const sendToPalette = async () => {
    const endpoint = 'http://192.168.86.250/files'; // Update the endpoint if needed
    const formData = new FormData();

    // Append colors data (JSON) to FormData
    formData.append('colors', JSON.stringify(colors));

    // Create text content from colors.map data (including SVG path data)
    const textContent = colors.map((c) => (
      `Color: ${c.color}, SVG Identifier: ${c.svgIdentifier}, Name: ${c.name}, Path Data: ${getPathData(c.svgIdentifier)}`
    )).join('\n');

    // Create a blob from the text content
    const blob = new Blob([textContent], { type: 'text/plain' });

    // Append the blob to FormData with a static file name and extension
    formData.append('myfile[]', blob, 'colors.txt');

    // Append additional parameters
    formData.append('path', '/');
    formData.append('/colors.txtS', '1'); // Updated append characters

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('File sent successfully');
        // Handle successful file transmission here
      } else {
        console.error('Failed to send file:', await response.text());
        // Handle server errors here
      }
    } catch (error) {
      console.error('Network error:', error);
      // Handle network errors here
    }
  };

  

  const removeColor = (index: number) => {
    setColors((colors) => colors.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen bg-[#e4b3c880] p-4 overflow-x-clip">
      <div className="flex flex-col md:flex-row h-full md:items-start">
        <div className="bg-blue-50 p-2 rounded">
          <h1 className="text-2xl">
            Customize your{" "}
            <span className="text-[#e4b3c8]">
              <i>Palette</i>
            </span>
          </h1>
          <hr className="mb-2 mt-1 border-black/20" />
          <div className="flex flex-col items-center">
            <div className="flex flex-col items-stretch min-w-[300px]">
              {colors.map((c, i) => {
                return (
                  <div className="flex justify-between items-center" key={i}>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => removeColor(i)}
                        className="text-red-500 w-4"
                      >
                        ⊖
                      </button>
                      <input
                        className="w-[80px]"
                        value={c.name ?? `Color ${i + 1}`}
                        onChange={(e) => handleRename(i, e.target.value)}
                      ></input>
                    </div>
                    <div className="flex space-x-4">
                      <input
                        type="color"
                        value={hslToHex(c.color)}
                        onChange={(e) =>
                          handleColorPickerChange(i, e.target.value)
                        }
                      />
                      <div className="w-[25px] h-[25px]">
                        {c.svgIdentifier.length > 0 && (
                          <SVGRouter
                            svgIdentifier={c.svgIdentifier}
                            color={hslToHex(c.color)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                className="border border-black hover:bg-gray-100 px-2 py-1 font-semibold rounded mx-2 my-2"
                onClick={addColor}
              >
                ➕ Add Color
              </button>
              <button
                className="flex items-center justify-center border bg-black hover:bg-gray-800 border-white text-white px-2 py-1 font-semibold rounded mx-2 mb-2"
                onClick={sendToPalette}
              >
                <img className="h-[20px] mr-2 mt-1" src="plogo.png" />
                Go
              </button>
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
      />
      {entries.map((e, i) => {
        return (
          <div
            key={i}
            className="absolute w-full h-full top-0 left-0"
            style={{ rotate: `${i * interval}deg` }}
          >
            <div
              className="absolute top-8 w-16 h-16"
              style={{ left: "calc(50% - 32px)" }}
            >
              {e.svgIdentifier.length > 0 && (
                <SVGRouter
                  svgIdentifier={e.svgIdentifier}
                  color={hslToHex(e.color)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

