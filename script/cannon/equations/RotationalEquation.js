import { Equation } from "../equations/Equation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class RotationalEquation extends Equation {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.RotationalEquation"]) return;

    console.groupCollapsed(`[RotationalEquation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    const rotationalEquationOptions = options.rotationalEquationOptions || {};

    const maxForce =
      typeof rotationalEquationOptions.maxForce !== "undefined"
        ? rotationalEquationOptions.maxForce
        : 1e6;

    const { bodyA, bodyB } = options;
    super.init({
      bi: bodyA,
      bj: bodyB,
      minForce: -maxForce,
      maxForce: maxForce
    });
    
    this.axisA = rotationalEquationOptions.axisA
      ? rotationalEquationOptions.axisA.clone()
      : new Vec3(1,0,0);
    this.axisB = rotationalEquationOptions.axisB
      ? rotationalEquationOptions.axisB.clone()
      : new Vec3(0,1,0);
    this.maxAngle = Math.PI / 2;
  }

  computeB(h) {
    const a = this.a;
    const b = this.b;
    const ni = this.axisA;
    const nj = this.axisB;
    const nixnj = this.tmpVec1;
    const njxni = this.tmpVec2;
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;

    // Caluclate cross products
    ni.cross(nj, nixnj);
    nj.cross(ni, njxni);

    // g = ni * nj
    // gdot = (nj x ni) * wi + (ni x nj) * wj
    // G = [0 njxni 0 nixnj]
    // W = [vi wi vj wj]
    GA.rotational.copy(njxni);
    GB.rotational.copy(nixnj);

    const g = Math.cos(this.maxAngle) - ni.dot(nj);
    const GW = this.computeGW();
    const GiMf = this.computeGiMf();

    const B = -g * a - GW * b - h * GiMf;

    return B;
  }
}
RotationalEquation.register("CANNON.RotationalEquation");

export { RotationalEquation };
