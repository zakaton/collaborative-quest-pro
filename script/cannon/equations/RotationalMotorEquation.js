import { Equation } from "../equations/Equation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class RotationalMotorEquation extends Equation {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.RotationalMotorEquation"]) return;

    console.groupCollapsed(`[RotationalMotorEquation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    const { bodyA, bodyB, maxForce } = options;
    super.init({
      bi: bodyA,
      bj: bodyB,
      minForce: -maxForce,
      maxForce: maxForce
    });

    this.axisA = new Vec3();
    this.axisB = new Vec3();
    this.targetVelocity = 0;
  }

  computeB(h) {
    const a = this.a;
    const b = this.b;
    const bi = this.bi;
    const bj = this.bj;
    const axisA = this.axisA;
    const axisB = this.axisB;
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;

    // g = 0
    // gdot = axisA * wi - axisB * wj
    // gdot = G * W = G * [vi wi vj wj]
    // =>
    // G = [0 axisA 0 -axisB]

    GA.rotational.copy(axisA);
    axisB.negate(GB.rotational);

    const GW = this.computeGW() - this.targetVelocity;
    const GiMf = this.computeGiMf();

    const B = -GW * b - h * GiMf;

    return B;
  }
}
RotationalMotorEquation.register("CANNON.RotationalMotorEquation");

export { RotationalMotorEquation };
