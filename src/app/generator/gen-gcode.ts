import {
  euclidDist,
  pathFromRawSVG,
  findIndexOfPointThatFullyFitUnderTargetLength,
  getTotalLengthOfSVGPath,
  manuallyComputeSVGPathLength,
  svgFromString,
  takeSegmentsUntilTargetLength,
  lerp,
  createPointAtFractionBetween,
  swatchToMinipaths,
} from "./utils";
import { pointsOnPath } from "points-on-path";

export function genFullGCode(swatchInputs: SwatchInput[]): string {
  const output_gcode: string[] = [];

  output_gcode.push(genSetup());

  swatchInputs.forEach((swatchInput, i) => {
    output_gcode.push(genResetToOriginAtIndex(i, swatchInputs.length));
    output_gcode.push(genSwatch(swatchInput));
  });
  output_gcode.push(genFinish());
  return output_gcode.join("\n");
}

function genSetup(): string {
  return "";
}

function genResetToOriginAtIndex(index: number, total: number): string {
  return `G1 X0 Y0`;
}

function genSwatch(swatchInput: SwatchInput): string {
  const minipaths = swatchToMinipaths(swatchInput);

  const output: string[] = [];
  for (let minipath of minipaths) {
    // SWITCH TO CYAN
    output.push(`G69"cmd:s1"`)
    for (let point of minipath) {
      output.push(`G1 X${point[0]} Y${point[1]} F300`);
    }
  }
  return output.join("\n")
}

function genFinish(): string {
  return "";
}

export interface SwatchInput {
  raw_svg_contents: string;
  color_percentages: [number, number, number, number, number]; // in CMYKW
}
