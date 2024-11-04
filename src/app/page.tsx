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

const defaultSVGContents = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   id="svg8"
   version="1.1"
   viewBox="0 0 45.548813 41.622181"
   height="41.622181mm"
   width="45.548813mm"
   sodipodi:docname="drawing4.svg"
   inkscape:version="0.92.4 (5da689c313, 2019-01-14)">
  <sodipodi:namedview
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1"
     objecttolerance="10"
     gridtolerance="10"
     guidetolerance="10"
     inkscape:pageopacity="0"
     inkscape:pageshadow="2"
     inkscape:window-width="1920"
     inkscape:window-height="1051"
     id="namedview7"
     showgrid="false"
     inkscape:zoom="2.9920347"
     inkscape:cx="62.988534"
     inkscape:cy="109.71072"
     inkscape:window-x="-9"
     inkscape:window-y="-9"
     inkscape:window-maximized="1"
     inkscape:current-layer="svg8"
     fit-margin-top="0"
     fit-margin-left="0"
     fit-margin-right="0"
     fit-margin-bottom="0" />
  <defs
     id="defs2" />
  <metadata
     id="metadata5">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title></dc:title>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <path
     sodipodi:type="spiral"
     style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:0.26458332"
     id="path7"
     sodipodi:cx="21.665159"
     sodipodi:cy="21.460316"
     sodipodi:expansion="1"
     sodipodi:revolution="10"
     sodipodi:radius="22.432873"
     sodipodi:argument="-18.656696"
     sodipodi:t0="0"
     d="m 21.665159,21.460316 c 0.331169,0.06467 0.07621,0.478316 -0.10749,0.550424 -0.497816,0.195408 -0.940894,-0.31244 -0.993358,-0.765406 -0.09385,-0.810248 0.665787,-1.423984 1.42332,-1.436291 1.11171,-0.01806 1.91634,1.022102 1.879225,2.081235 -0.04947,1.411659 -1.37923,2.412341 -2.73915,2.322159 -1.71132,-0.113484 -2.910165,-1.736688 -2.765092,-3.397065 0.175702,-2.010939 2.09432,-3.409034 4.05498,-3.208026 2.310569,0.23688 3.908556,2.452059 3.650959,4.712895 -0.297405,2.610224 -2.809869,4.408516 -5.370809,4.093893 -2.909904,-0.357494 -4.908781,-3.16773 -4.536827,-6.028725 0.417275,-3.209603 3.525627,-5.409268 6.686639,-4.97976 3.509322,0.476835 5.909923,3.883554 5.422694,7.344554 -0.536226,3.809056 -4.241502,6.410705 -8.002469,5.865628 -4.108802,-0.595489 -6.911589,-4.599468 -6.308562,-8.660384 0.654651,-4.408558 4.95745,-7.412553 9.3183,-6.751495 4.708323,0.71373 7.913582,5.315441 7.194429,9.976214 -0.772745,5.008096 -5.673444,8.414666 -10.634129,7.637362 -5.307875,-0.831705 -8.915795,-6.031454 -8.080297,-11.292043 0.890621,-5.607659 6.389472,-9.416961 11.949959,-8.52323 5.907448,0.949497 9.918159,6.747495 8.966164,12.607873 C 31.665303,29.817369 25.56812,34.029513 19.407856,33.019225 12.900819,31.952067 8.4872214,25.555668 9.5558252,19.095522 10.681777,12.288685 17.37742,7.6736168 24.137444,8.8005574 31.244083,9.9852812 36.060637,16.980193 34.875342,24.040091 33.631864,31.446535 26.337662,36.464589 18.977894,35.220923 11.271643,33.918707 6.0520769,26.325197 7.3541281,18.66556 8.7150674,10.6595 16.607903,5.2384116 24.567406,6.5988604 32.873276,8.0185107 38.495896,16.210686 37.077039,24.470053 35.598689,33.075736 27.10716,38.899896 18.547931,37.42262 9.6424352,35.88558 3.6167275,27.094685 5.1524311,18.235597 6.7481516,9.0302863 15.838422,2.8030239 24.997368,4.3971633 34.502495,6.0515562 40.931318,15.441212 39.278736,24.900016 37.565678,34.704959 27.876628,41.335349 18.117969,39.624317 8.0132069,37.8526 1.1812456,27.864148 2.950734,17.805635 4.7811023,7.4010538 15.068965,0.36751628 25.427331,2.1954662 36.131731,4.084481 43.36685,14.67176 41.480433,25.329978 39.532777,36.334199 28.646076,43.770902 17.688006,41.826014 6.3839641,39.819721 -1.2543268,28.633592 0.74903688,17.375672 2.8139618,5.7718082 14.299524,-2.0680743 25.857293,-0.00623091 37.76098,2.1173222 45.802457,13.902323 43.68213,25.759941"
     transform="matrix(0.92940728,0,0,0.93587849,2.0553284,1.3843445)" />
</svg>`;

export default function Home() {
  const [svgContents, setSvgContents] = useState<string>(defaultSVGContents);
  const [colors, setColors] = useState<ColorEntry[]>([]);

  // fetch("/drawing4.svg", {
  //   method: 'GET',
  //   mode: 'no-cors', // Added no-cors mode
  // })
  //   .then((response) => response.text())
  //   .then((d) => {
  //     setSvgContents(d);
  //     console.log(d);
  //     console.log(
  //       genFullGCode([
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0, 0.3, 0.7, 0, 0], //purple
  //         },
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0.1, 0.45, 0.45, 0, 0], //purple
  //         },
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0.2, 0.6, 0.2, 0, 0], //purple
  //         },
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0.3, 0.35, 0.35, 0, 0], //purple
  //         },
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0.5, 0.2, 0.3, 0, 0], //purple
  //         },
  //         {
  //           raw_svg_contents: d,
  //           length_percentage: 1,
  //           color_percentages: [0.7, 0.3, 0.0, 0, 0], //purple
  //         }
  //       ])
  //     );
  //   });

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
  
      // Updated endpoint to send to "/colors.txt" on the ESP32
      const endpoint = "/colors.txt";
  
      // Create text content from colors.map data (including SVG path data)
      const textContent = gCode;
  
      // Create a blob from the text content
      const blob = new Blob([textContent], { type: "text/plain" });
  
      // Prepare FormData to mimic a file upload
      const formData = new FormData();
      formData.append("sdfiles", blob, "colors.txt");
  
      console.log("FormData prepared:", formData);
  
      // Send the request
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "no-cors", // Added no-cors mode
        body: formData,
      });
  
      if (response.ok) {
        console.log("File sent successfully");
        // Handle successful file transmission here
      } else {
        console.error("Failed to send file:", await response.text());
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
        </div>
      </div>
  );
}