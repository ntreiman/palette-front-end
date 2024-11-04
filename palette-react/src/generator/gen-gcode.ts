import {
  swatchToMinipaths
} from "./utils";

import {cartesianToArmAngles,cartesianToArmAngles_Feed} from "./kinematic_functions";



export function genFullGCode(swatchInputs: SwatchInput[]): string {
const output_gcode: string[] = [];

output_gcode.push(genSetup());

swatchInputs.forEach((swatchInput, i) => {
  output_gcode.push(genResetToSwatchOrigin(i, swatchInputs.length));
  //let w_offset = (i) * 2*Math.PI/14 ;
  let w_offset = ((i) * 2*Math.PI/30) *1.3 ;
  output_gcode.push(genSwatch(swatchInput, w_offset));
});
output_gcode.push(genFinish());
return output_gcode.join("\n");
}

function genSetup(): string {
return "";
}

function genResetToSwatchOrigin(index: number, total: number): string {
return ``;
}


function genSwatch(swatchInput: SwatchInput, w_offset: number): string {

const minipaths = swatchToMinipaths(swatchInput);
const colorPercentages = swatchInput.color_percentages;
const row = swatchInput.row;
const nonZeroColorIndices = colorPercentages.map((percentage, index) => percentage > 0 ? index : -1).filter(index => index !== -1);

const output: string[] = [];
//output.push(`list: ${nonZeroColorIndices}`);
for (let minipath of minipaths) {
  // SWITCH TO CYAN
   
     //const phi = 8*Math.PI/180;
  //const rho = 60;
  const index = nonZeroColorIndices[minipaths.indexOf(minipath)];

  let phi_rho = [
    [14.9*Math.PI/180, 61], 
    [5.5*Math.PI/180, 62.3], 
    [-4.8*Math.PI/180, 61.8], 
    [-14.7*Math.PI/180, 61], 
    [40*Math.PI/180, 60], 
    [70*Math.PI/180, 60]
  ];

  let point = minipath[1];
  const r_offset = row * 15;
  //-72.113311,-73.671786
  let pre_x = (point[0]   - 45.548813/2)/2 + 53;
  //let pre_x = (point[0]  - 45.548813/2)/2 + 60 -r_offset;
  let pre_y = (point[1] -41.622181/2)/2;
  //let pre_x = 45;
  //let pre_y = 0;
  
  let [pre_a, pre_b] = cartesianToArmAngles(w_offset, pre_x, pre_y, phi_rho[index][0],phi_rho[index][1]);

  let dispense_pressure = 26.0;
  let feed_scalar = 1;
  //pressures for nail polish
  // if(index == 0){
  //   dispense_pressure = 26.3;
  // }else if(index == 1){
  //   dispense_pressure = 26.3;
  // }else if(index == 2){
  //   dispense_pressure = 26.3;
  // }else if(index == 3){
  //   dispense_pressure = 26.9;
  // }
     switch(index) {
       case 0:
         dispense_pressure = 26;
         feed_scalar = 1.2;
         break;
       case 1:
         dispense_pressure = 24.5;
         feed_scalar = 0.6;
         break;
       case 2:
         dispense_pressure = 24;
         feed_scalar = 1;
         break;
       case 3:
         dispense_pressure = 24;
         feed_scalar = 1;
         break;
     }
     

     
  output.push(`G0 X${pre_a.toFixed(3)} Y${pre_b.toFixed(3)}`);
 // output.push(`phi=${phi_rho[index][0]}`);
  output.push(`G4 P0.05`);
  output.push(`G69"DIS${index+2}P${dispense_pressure}T200000"`);
  output.push(`G71`);
  let retracted_yet = false;
  for (let i = 0; i < minipath.length; i++) {
    let point = minipath[i];
    //X64.974 Y15.789
    
    let x = (point[0]  - 45.548813/2)/2 + 53;
    //let x = (point[0]  - 45.548813/2)/2 + 60 -r_offset;

    let y = (point[1]-41.622181/2)/2;
   //output.push(`X,Y=(${x},${y}`);
    //let x = 45;
    //let y = 0;
   
    
    let [a, b, feed] = cartesianToArmAngles_Feed(feed_scalar, w_offset, x, y, pre_x, pre_y, pre_a, pre_b, phi_rho[index][0],phi_rho[index][1]);
    if(isNaN(feed)) feed = 2000;
    if (minipath.length - i == 3) {
      output.push(`G4 P0.05`);
      output.push(`G69"RET${index+2}"`);
      output.push(`G4 P0.05`);
      retracted_yet = true;
    }
    if (isNaN(a) || isNaN(b) ) {
      output.push("ERROR!");
      return "ERROR"
    }else{
    output.push(`G1 X${a.toFixed(3)} Y${b.toFixed(3)} F${feed.toFixed(3)}`);
    }
    pre_x = point[0];
    pre_y = point[1];
    pre_a = a;
    pre_b = b;
  
  }
  // output.push(`G4 P0.2`);
  // output.push(`G69"CMD:R${index+2}"`);
  // output.push(`G4 P0.5`);
  // output.push(`G69"CMD:P0"`);
  // output.push(`G4 P0.8`);
  // output.push(`G69"CMD:S0"`);
  // output.push(`G4 P0.05`);
  // output.push(`G69"CMD:S0"`);
  // output.push(`G4 P0.05`);
  // output.push(`G69"CMD:S0"`);
  // output.push(`G4 P0.05`);
  // output.push(`G69"CMD:S0"`);
  // output.push(`G4 P0.05`);

  if (!retracted_yet) {
    output.push(`G4 P0.05`);
    output.push(`G69"RET${index+2}"`);
    output.push(`G4 P0.05`);
    retracted_yet = true;
  }

 output.push(`G4 P1`);
}
return output.join("\n")

}

function genFinish(): string {
return "G0 X180";
}

export interface SwatchInput {
raw_svg_contents: string;
length_percentage: number;
row: number;
color_percentages: [number, number, number, number, number]; // in CMYKW
}
