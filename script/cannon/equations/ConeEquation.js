import { Vec3 } from "../math/Vec3.js";
import { Equation } from "../equations/Equation.js";
import { Body } from "../objects/Body.js";

/* global Croquet, ISLAND */

class ConeEquation extends Equation {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ConeEquation"]) return;

    console.groupCollapsed(`[ConeEquation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const coneEquationOptions = options.coneEquationOptions || {};
    const maxForce =
      typeof coneEquationOptions.maxForce !== "undefined"
        ? coneEquationOptions.maxForce
        : 1e6;

    const { bodyA, bodyB } = options;
    super.init({
      bi: bodyA,
      bj: bodyB,
      minForce: -maxForce,
      maxForce
    });

    this.axisA = coneEquationOptions.axisA
      ? coneEquationOptions.axisA.clone()
      : new Vec3(1, 0, 0);
    this.axisB = coneEquationOptions.axisB
      ? coneEquationOptions.axisB.clone()
      : new Vec3(0, 1, 0);
    this.angle =
      typeof coneEquationOptions.angle !== "undefined"
        ? coneEquationOptions.angle
        : 0;
  }

  static get tmpVec1() {
    const name = "CANNON.ConeEquation.tmpVec1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get tmpVec2() {
    const name = "CANNON.ConeEquation.tmpVec2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  computeB(h) {
    const a = this.a;
    const b = this.b;
    const ni = this.axisA;
    const nj = this.axisB;
    const nixnj = ConeEquation.tmpVec1;
    const njxni = ConeEquation.tmpVec2;
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;

    // Caluclate cross products
    ni.cross(nj, nixnj);
    nj.cross(ni, njxni);

    // The angle between two vector is:
    // cos(theta) = a * b / (length(a) * length(b) = { len(a) = len(b) = 1 } = a * b

    // g = a * b
    // gdot = (b x a) * wi + (a x b) * wj
    // G = [0 bxa 0 axb]
    // W = [vi wi vj wj]
    GA.rotational.copy(njxni);
    GB.rotational.copy(nixnj);

    const g = Math.cos(this.angle) - ni.dot(nj);
    const GW = this.computeGW();
    const GiMf = this.computeGiMf();

    const B = -g * a - GW * b - h * GiMf;

    return B;
  }
}
ConeEquation.register("CANNON.ConeEquation");

export { ConeEquation };
