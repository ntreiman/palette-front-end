function findSingleLayerPath(lines: string[]): string[] {
    return lines.filter(line => line.startsWith('G1'));
}

function interpolatePoints(x1: number, y1: number, x2: number, y2: number, interpolationStepSize: number): [number, number][] {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx ** 2 + dy ** 2);
    const numPoints = Math.floor(dist / interpolationStepSize);
    const points: [number, number][] = [[x1, y1]];
    for (let i = 1; i <= numPoints; i++) {
        const t = i / (numPoints + 1);
        const x = x1 + t * dx;
        const y = y1 + t * dy;
        points.push([x, y]);
    }
    points.push([x2, y2]);
    return points;
}

function interpolateGcode(g1Commands: string[], interpolationStepSize: number): [number, string[]] {
    let length = 0;
    let prevX: number | null = null;
    let prevY: number | null = null;
    const newLines: string[] = [];
    g1Commands.forEach(cmd => {
        const coords = cmd.match(/X([\d.]+) Y([\d.]+)/);
        if (coords) {
            const x = parseFloat(coords[1]);
            const y = parseFloat(coords[2]);
            if (prevX !== null && prevY !== null) {
                const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
                length += dist;
                if (dist > interpolationStepSize) {
                    const points = interpolatePoints(prevX, prevY, x, y, interpolationStepSize);
                    points.slice(1).forEach(point => {
                        newLines.push(`G1 X${point[0].toFixed(3)} Y${point[1].toFixed(3)} E0.05`);
                    });
                } else {
                    newLines.push(cmd);
                }
            }
            prevX = x;
            prevY = y;
        }
    });
    return [length, newLines];
}
function breakIntoSegments(
    g1Commands: string[], pathLength: number, percentages: number[], gapLength: number, interpolationPoints: number = 100
): string[] {
    const totalLength = pathLength - (percentages.length - 1) * gapLength;
    const segmentLengths = percentages.map(p => totalLength * p);
    let distanceToGo = segmentLengths[0];

    let isSegment = true;
    let lastIsSegment = false;
    const newGcode: string[] = [];
    let currentLength = 0;
    let segmentIndex = 0; // this should be set to the first segment index that isn't 0 length
    while (segmentLengths[segmentIndex] === 0) { // make this set segment index to the next thing that has length > 0
        segmentIndex += 1;
    }

    let prevX: number | null = null;
    let prevY: number | null = null;
    newGcode.push(`T${segmentIndex + 1}\n`); // Move to 0 mm on Z

    for (const cmd of g1Commands) {
        const coords = cmd.match(/X([\d.]+) Y([\d.]+)/);
        if (coords) {
            const x = parseFloat(coords[1]);
            const y = parseFloat(coords[2]);
            if (isSegment === true) {
                // add unmodified gcode
                if (lastIsSegment === false) {
                    newGcode.push(`G0 X${x} Y${y} F5600 ;move to new start \n`); // Move to the next segment start position
                    newGcode.push(`G0 Z${0 - 0.23 * segmentIndex} ;move to printing z pos\n`);
                    newGcode.push(`G1 E1 f80 ;dwell \n`);
                    newGcode.push(`G1 E1 f5600 ;dwell \n`);
                }
                newGcode.push(`G1 X${x} Y${y} E0.2 F5600\n`);
            }
            lastIsSegment = isSegment;
            if (prevX !== null && prevY !== null) {
                const segment = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
                currentLength += segment;

                if (currentLength > distanceToGo) { // we hit the end
                    isSegment = !isSegment;
                    if (isSegment === false) { // do a gap
                        if (segmentIndex >= percentages.length - 1) {
                            // end, no need for gap
                            newGcode.push(`;Interrupted`);
                            break;
                        }
                        distanceToGo = gapLength;
                        newGcode.push('M118 P2 S{"m"} ;stop printing\n');
                        newGcode.push(`G0 Z5\n`);
                    } else { // don't do a gap
                        segmentIndex += 1;
                        distanceToGo = segmentLengths[segmentIndex];
                        const startX = x, startY = y;
                        newGcode.push(`G0 X${startX} Y${startY} F5600 \n`); // Move to the next segment start position
                        newGcode.push(`T${segmentIndex + 1}\n`); // Move to 0 mm on Z
                    }
                    currentLength = 0;
                }
            }
            prevX = x;
            prevY = y;
        } else {
            newGcode.push(cmd + ";old");
        }
    }
    newGcode.push('M118 P2 S{"m"} ;stop printing\n');
    newGcode.push(`G0 Z5\n`);
    newGcode.push(`;The End`);
    return newGcode;
}

function generateSpiral(percentages: number[], inputGcode: string[], gapLength: number): string[] {
    let gcodeLines = inputGcode;
    let singleLayerPath = findSingleLayerPath(gcodeLines);

    // Define percentages here
    gapLength = 4; // Define gapLength
    let [pathLength, interpolatedSingleLayerPath] = interpolateGcode(singleLayerPath, 0.1);
    let segmentedGcode = breakIntoSegments(interpolatedSingleLayerPath, pathLength, percentages, gapLength);
    // Replace the single layer path with the segmented path in the original gcode
    let outputGcode: string[] = [];
    // initialX, initialY = 100, 100
    outputGcode.push(`G0 Z5\n`);
    // outputGcode.push(`G0 X${initialX} Y${initialX}\n`);
    let singleLayerFlag = false;
    for (let line of gcodeLines) {
        if (line.startsWith("G1") && !singleLayerFlag) {
            outputGcode = outputGcode.concat(segmentedGcode);
            singleLayerFlag = true;
        } else if (!line.startsWith("G1")) {
            outputGcode.push(line);
        }
    }
    return outputGcode;
}

function main(): string {
    const gap_length: number = 4;
    const y_spacing: number = 23;
    let input_percentages: number[][] = [];
    const input_files: string[] = [
        "final_circle.gcode",
        "final_diamond.gcode",
        "final_pentagon.gcode",
        "final_heart.gcode",
    ];
    let output_gcode: string[] = [];
    const originX: number = 100, originY: number = 100;

    let percentages: number[] = [0.6, 0.4, 0.0, 0.0, 0.0];
    for (let i = 0; i < 5; i++) {
        input_percentages.push(percentages);
    }

    output_gcode.push(`G54\n`);
    output_gcode.push(`G0 X150 Y0 Z20 f4000\n`);
    output_gcode.push(`G55\n`);
    output_gcode.push(`G10 L20 P2 X0 Y0\n`); // set x y to 0
    output_gcode.push(`g10 p1 z{global.n_off_1}\n g10 p2 z{global.n_off_2}\n g10 p3 z{global.n_off_3}\n g10 p4 z{global.n_off_4}\n g10 p5 z{global.n_off_5}`);

    input_files.forEach((input_file, index) => {
        const new_gcode: string[] = generateSpiral(input_percentages[index], readGcode(input_file), gap_length);
        output_gcode = output_gcode.concat(new_gcode);

        output_gcode.push(`T0\n`); // retract tools
        output_gcode.push(`G91\n G0 Z5\n G90\n G55\n`);
        output_gcode.push(`G0 X0 F5600\n`);
        output_gcode.push(`G91\n G0 Y${y_spacing} F2000\n G90\n G55\n`); // move to next space
        output_gcode.push(`G10 L20 P2 X0 Y0\n`); // set x y to 0
        output_gcode.push('M118 P2 S{"m"} ;stop printing\n');
        output_gcode.push('M118 P2 S{"m"} ;stop printing\n');
        output_gcode.push(`T0\n`); // retract tools
    });

    return output_gcode.join('\n');
}
