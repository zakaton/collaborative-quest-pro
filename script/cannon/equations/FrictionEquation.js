import { Equation } from "../equations/Equation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class FrictionEquation extends Equation {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.FrictionEquation"]) return;

    console.groupCollapsed(`[FrictionEquation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    const { bodyA, bodyB, slipForce } = options;
    
    super.init({
      bi: bodyA,
      bj: bodyB,
      minForce: -slipForce,
      maxForce: slipForce
    });
    
    this.ri = new Vec3();
    this.rj = new Vec3();
    this.t = new Vec3();
  }
  
  static get FrictionEquation_computeB_temp1() {
    const name = "CANNON.FrictionEquation.FrictionEquation_computeB_temp1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get FrictionEquation_computeB_temp2() {
    const name = "CANNON.FrictionEquation.FrictionEquation_computeB_temp2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  computeB(h) {
    const a = this.a;
    const b = this.b;
    const bi = this.bi;
    const bj = this.bj;
    const ri = this.ri;
    const rj = this.rj;
    const rixt = FrictionEquation.FrictionEquation_computeB_temp1;
    const rjxt = FrictionEquation.FrictionEquation_computeB_temp2;
    const t = this.t;

    // Caluclate cross products
    ri.cross(t, rixt);
    rj.cross(t, rjxt);

    // G = [-t -rixt t rjxt]
    // And remember, this is a pure velocity constraint, g is always zero!
    const GA = this.jacobianElementA;

    const GB = this.jacobianElementB;
    t.negate(GA.spatial);
    rixt.negate(GA.rotational);
    GB.spatial.copy(t);
    GB.rotational.copy(rjxt);

    const GW = this.computeGW();
    const GiMf = this.computeGiMf();

    const B = -GW * b - h * GiMf;

    return B;
  }
}
FrictionEquation.register("CANNON.FrictionEquation");

export { FrictionEquation };
