



export function cartesianToArmAngles_Feed(feed_scalar: number, w_offset: number, x: number, y: number, pre_x: number, pre_y: number, pre_a: number, pre_b: number, phi: number, rho: number): [number, number, number] {
    //cartesian to polar
  
    let r2 = Math.sqrt(x * x + y * y);
 
    const w = Math.atan2(y, x) + w_offset;
    //polar to cartesian
    const r1 = 21.514;
    //const phi = 8*Math.PI/180;
    //const rho = 60;

    let alpha = phi + Math.acos((rho*rho + r1*r1 - r2*r2)/(2*rho*r1));
    let beta = w + Math.acos((r2*r2+r1*r1-rho*rho)/(2*r1*r2));

    const a = alpha * (180 / Math.PI); // Convert to degrees
    const b = beta * (180 / Math.PI); // Convert to degrees

    let dx = x-pre_x;
    let dy = y-pre_y;
    let cartesian_distance = Math.sqrt(dx*dx+dy*dy); 

    let da = a-pre_a;
    let db = b-pre_b;
    let angular_distance = Math.sqrt(da*da+db*db); 

    let scalar = angular_distance/cartesian_distance;
    //let feed = scalar*1000*38;
    let feed = scalar*1000*13*1.5*feed_scalar;
    if(feed < 2) { feed = 1000; }
    
    
    return [a,b, feed];

}

export function cartesianToArmAngles(w_offset: number, x: number, y: number, phi: number, rho: number): [number, number] {
    //cartesian to polar

 
    let r2 = Math.sqrt(x * x + y * y);
   
    const w = Math.atan2(y, x) + w_offset;
    //polar to cartesian
    const r1 = 21.514;
    //const phi = 0;
    //const rho = 50;

    let alpha = phi + Math.acos((rho*rho + r1*r1 - r2*r2)/(2*rho*r1));
    let beta = w + Math.acos((r2*r2+r1*r1-rho*rho)/(2*r1*r2));

    const a = alpha * (180 / Math.PI); // Convert to degrees
    const b = beta * (180 / Math.PI); // Convert to degrees

    return [a,b];

}