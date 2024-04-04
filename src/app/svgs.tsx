export function SVGRouter({
  svgIdentifier,
  color,
}: {
  svgIdentifier: string;
  color: string;
}) {
  let pathData = getPathData(svgIdentifier);
  if (!pathData) {
    throw new Error("Invalid SVG identifier");
  }

  const coordinates = convertPathToCoordinates(pathData);
  // const formattedCoordinates = formatCoordinates(coordinates);

  // Render the original SVG components based on svgIdentifier
  if (svgIdentifier === "diamond") {
    return (
      <>
        {/*<pre>{formattedCoordinates}</pre> - Display formatted coordinates for testing */}
        <DiamondSVG color={color} />
      </>
    );
  }
  if (svgIdentifier === "heart") {
    return (
      <>
        {/*<pre>{formattedCoordinates}</pre> - Display formatted coordinates for testing */}
        <NestedHeartSVG color={color} />
      </>
    );
  }

  throw new Error("unknown svg");
}


function DiamondSVG({ color }: { color: string }) {
  return (
    <svg
      className="w-full h-full"
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="50,0 100,50 50,100 0,50"
        fill={color}
        stroke="black"
        strokeWidth="2"
      />
    </svg>
  );
}

function NestedHeartSVG({ color }: { color: string }) {
  return (
    <svg
      className="w-full h-full"
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outermost heart */}
      <path
        d="M50 30 Q55 10, 80 20 Q100 30, 75 60 L50 90 L25 60 Q0 30, 20 20 Q45 10, 50 30 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Middle heart */}
      <path
        d="M50 35 Q53 20, 70 27 Q85 35, 65 55 L50 75 L35 55 Q15 35, 30 27 Q47 20, 50 35 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Innermost heart */}
      <path
        d="M50 40 Q52 30, 60 34 Q70 40, 55 50 L50 55 L45 50 Q30 40, 40 34 Q48 30, 50 40 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

// This function retrieves the SVG path data based on svgIdentifier
export function getPathData(svgIdentifier: string, customPathData = null) {
  const paths: Record<string, string> = {
    diamond: "50,0 100,50 50,100 0,50",
    heart: "M50 30 Q55 10, 80 20 Q100 30, 75 60 L50 90 L25 60 Q0 30, 20 20 Q45 10, 50 30 Z",
  };

  // If customPathData is provided dynamically, return it direct
  if (customPathData) {
    return customPathData;
  }

  return paths[svgIdentifier] || null;
}

// Define a function to convert SVG path data to x and y coordinates
export function convertPathToCoordinates(pathData: string): { x: number; y: number }[] {
  const commands = pathData.match(/[a-zA-Z][0-9.,\s-]*/g) || []; // Extract commands and parameters
  let x = 0;
  let y = 0;
  const coordinates: { x: number; y: number }[] = [];

  commands.forEach((command) => {
    const params = command.trim().split(/\s+/); // Split command and parameters
    const letter = params.shift(); // Get the command letter

    switch (letter) {
      case 'M':
        x = parseFloat(params[0]);
        y = parseFloat(params[1]);
        coordinates.push({ x, y });
        break;
      case 'L':
        x = parseFloat(params[0]);
        y = parseFloat(params[1]);
        coordinates.push({ x, y });
        break;
      // Handle other commands like Q, C, etc., if needed
    }
  });

  return coordinates;
}

// Define a function to convert x and y coordinates to the desired format
export function formatCoordinates(coordinates: { x: number; y: number }[]): string {
  let output = '';
  coordinates.forEach(({ x, y }) => {
    output += `G0 X${x.toFixed(2)} Y${y.toFixed(2)}\n`;
  });
  return output.trim();
}

// Example usage
// const pathData = 'm50 0 50 50-50 50L0 50z';
// const coordinates = convertPathToCoordinates(pathData);
// const formattedOutput = formatCoordinates(coordinates);
// console.log(formattedOutput);
