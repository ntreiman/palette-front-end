import { pointsOnPath } from "points-on-path";
import { SwatchInput } from "./gen-gcode";

export function pathFromRawSVG(svg_string: string): string {
  const svg_doc = svgFromString(svg_string);
  const path = svg_doc.querySelector("path");
  return path ? path.getAttribute("d") || '' : '';
}



export function svgFromString(svg_string: string): Document {
  const parser = new DOMParser();
  const svg_doc = parser.parseFromString(svg_string, "text/xml");
  return svg_doc;
}


export function getTotalLengthOfSVGPath(svg_string: string): number {
  const svg_doc = svgFromString(svg_string);
  const path = svg_doc.querySelector("path");
  return path ? path.getTotalLength() : 0;
}

export function manuallyComputeSVGPathLength(points: [number, number][]): number {
  return points.reduce((acc, curr, i, arr) => {
    if (i === 0) return 0;
    return euclidDist(curr, arr[i - 1]) + acc;
  }, 0);
}

export function euclidDist(p1: [number, number], p2: [number, number]) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// returns the INDEX of the last point that is part of the target length    
// IMPORTANT NOTE: this is not actually acurate, we should be splitting the last segment into two
// if we want perfect accuracy
export function takeSegmentsUntilTargetLength(points: [number, number][], targetLength: number): number {
    let currentLength = 0;
    for (let i = 0; i < points.length - 1; i++) { // Adjusted to prevent accessing undefined point
        const segmentLength = euclidDist(points[i], points[i + 1]);
        if (currentLength > targetLength) {
          return i;
        }
        currentLength += segmentLength; // Update current length after checking
    }
    return points.length - 1;
}

// these segments are GUARENTEED LEQ to targetLength
export function findIndexOfPointThatFullyFitUnderTargetLength(points: [number, number][], targetLength: number): number {
  let currentLength = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const segmentLength = euclidDist(points[i - 1], points[i]);
    if (currentLength + segmentLength > targetLength) {
      return i
    }
    currentLength += segmentLength;
  }
  return points.length - 1;
}

export function lerp(p1: [number, number], p2: [number, number], fraction: number): [number, number] {
  return [
    p1[0] + fraction * (p2[0] - p1[0]),
    p1[1] + fraction * (p2[1] - p1[1]),
  ];
}


export function createPointAtFractionBetween(
  a: [number, number],
  b: [number, number],
  targetLength: number
) {
  const segmentLength = euclidDist(a, b);
  const fraction = targetLength / segmentLength;
  return lerp(a, b, fraction)
}

type Point = [number, number]
type Minipath = Point[]
export function swatchToMinipaths(swatchInput: SwatchInput): Minipath[] {
      const numColors = swatchInput.color_percentages.filter(
        (p) => p > 0.0001
      ).length;
      const GAP_LENGTH = 2;
      const numGaps = numColors - 1;
      const path = pathFromRawSVG(swatchInput.raw_svg_contents);
      const points = pointsOnPath(path, 0.05)[0]; // we only have 1 path in our svgs 

      const numPoints = Math.floor(points.length * swatchInput.length_percentage);
      const truncatedPoints = points.slice(0, numPoints);

      const length = manuallyComputeSVGPathLength(truncatedPoints);
      const lengthsPerColor = swatchInput.color_percentages.map(
        (p) => (length - GAP_LENGTH * numGaps) * p
      );

      let mutPoints = [...truncatedPoints]; // this will be sliced into segments
      const minipathsPerColor = [];
      //console.log("SANITY CHECK: total number of points", mutPoints.length);
      //console.log(
       // "SANITY CHECK: total number of segments",
        //mutPoints.length - 1
      //);

      for (let i = 0; i < lengthsPerColor.length; i++) {
        if (lengthsPerColor[i] < 0.0001) {
          continue;
        }

        // DO IT FOR THE COLOR SEGMENT
        const targetLength = lengthsPerColor[i];
        const indexOfPointThatUndercounts =
          findIndexOfPointThatFullyFitUnderTargetLength(
            mutPoints,
            targetLength
          );
        const minipath = mutPoints.slice(0, indexOfPointThatUndercounts);
        mutPoints.splice(0, indexOfPointThatUndercounts - 1);

        // split the next segment in two so that the fractions are perfect
        const newPoint = createPointAtFractionBetween(
          mutPoints[0],
          mutPoints[1],
          targetLength - manuallyComputeSVGPathLength(minipath)
        );
        minipath.push(newPoint);
        mutPoints = [newPoint, ...mutPoints.slice(1)];

        minipathsPerColor.push(minipath);

        // COPY PASTE EVERYTHING FOR THE GAP

        const GAPindexOfPointThatUndercounts =
          findIndexOfPointThatFullyFitUnderTargetLength(mutPoints, GAP_LENGTH);
        const GAPundercountedLength = manuallyComputeSVGPathLength(
          mutPoints.slice(0, GAPindexOfPointThatUndercounts)
        );

        mutPoints.splice(0, GAPindexOfPointThatUndercounts - 1);
        const GAPnewPoint = createPointAtFractionBetween(
          mutPoints[0],
          mutPoints[1],
          GAP_LENGTH - GAPundercountedLength
        );
        mutPoints = [GAPnewPoint, ...mutPoints.slice(1)];
      }
      return minipathsPerColor
}