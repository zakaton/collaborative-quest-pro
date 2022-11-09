import { Equation } from "../equations/Equation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class ContactEquation extends Equation {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ContactEquation"]) return;

    console.groupCollapsed(`[ContactEquation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const { bodyA, bodyB } = options;
    const maxForce = "maxForce" in options ? options.maxForce : 1e6;

    super.init({
      bi: bodyA,
      bj: bodyB,
      minForce: 0,
      maxForce
    });

    this.restitution = 0.0;
    this.ri = new Vec3();
    this.rj = new Vec3();
    this.ni = new Vec3();
  }

  static get ContactEquation_computeB_temp1() {
    const name = "CANNON.ContactEquation.ContactEquation_computeB_temp1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get ContactEquation_computeB_temp2() {
    const name = "CANNON.ContactEquation.ContactEquation_computeB_temp2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get ContactEquation_computeB_temp3() {
    const name = "CANNON.ContactEquation.ContactEquation_computeB_temp3";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get ContactEquation_getImpactVelocityAlongNormal_vi() {
    const name =
      "CANNON.ContactEquation.ContactEquation_getImpactVelocityAlongNormal_vi";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get ContactEquation_getImpactVelocityAlongNormal_vj() {
    const name =
      "CANNON.ContactEquation.ContactEquation_getImpactVelocityAlongNormal_vj";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get ContactEquation_getImpactVelocityAlongNormal_xi() {
    const name =
      "CANNON.ContactEquation.ContactEquation_getImpactVelocityAlongNormal_xi";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get ContactEquation_getImpactVelocityAlongNormal_xj() {
    const name =
      "CANNON.ContactEquation.ContactEquation_getImpactVelocityAlongNormal_xj";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get ContactEquation_getImpactVelocityAlongNormal_relVel() {
    const name =
      "CANNON.ContactEquation.ContactEquation_getImpactVelocityAlongNormal_relVel";
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
    const rixn = ContactEquation.ContactEquation_computeB_temp1;
    const rjxn = ContactEquation.ContactEquation_computeB_temp2;
    const vi = bi.velocity;
    const wi = bi.angularVelocity;
    const fi = bi.force;
    const taui = bi.torque;
    const vj = bj.velocity;
    const wj = bj.angularVelocity;
    const fj = bj.force;
    const tauj = bj.torque;
    const penetrationVec = ContactEquation.ContactEquation_computeB_temp3;
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const n = this.ni;

    // Caluclate cross products
    ri.cross(n, rixn);
    rj.cross(n, rjxn);

    // g = xj+rj -(xi+ri)
    // G = [ -ni  -rixn  ni  rjxn ]
    n.negate(GA.spatial);
    rixn.negate(GA.rotational);
    GB.spatial.copy(n);
    GB.rotational.copy(rjxn);

    // Calculate the penetration vector
    penetrationVec.copy(bj.position);
    penetrationVec.vadd(rj, penetrationVec);
    penetrationVec.vsub(bi.position, penetrationVec);
    penetrationVec.vsub(ri, penetrationVec);

    const g = n.dot(penetrationVec);

    // Compute iteration
    const ePlusOne = this.restitution + 1;
    const GW =
      ePlusOne * vj.dot(n) - ePlusOne * vi.dot(n) + wj.dot(rjxn) - wi.dot(rixn);
    const GiMf = this.computeGiMf();

    const B = -g * a - GW * b - h * GiMf;

    return B;
  }

  /**
   * Get the current relative velocity in the contact point.
   * @method getImpactVelocityAlongNormal
   * @return {number}
   */
  getImpactVelocityAlongNormal() {
    const vi = ContactEquation.ContactEquation_getImpactVelocityAlongNormal_vi;
    const vj = ContactEquation.ContactEquation_getImpactVelocityAlongNormal_vj;
    const xi = ContactEquation.ContactEquation_getImpactVelocityAlongNormal_xi;
    const xj = ContactEquation.ContactEquation_getImpactVelocityAlongNormal_xj;
    const relVel =
      ContactEquation.ContactEquation_getImpactVelocityAlongNormal_relVel;

    this.bi.position.vadd(this.ri, xi);
    this.bj.position.vadd(this.rj, xj);

    this.bi.getVelocityAtWorldPoint(xi, vi);
    this.bj.getVelocityAtWorldPoint(xj, vj);

    vi.vsub(vj, relVel);

    return this.ni.dot(relVel);
  }

  destroy() {
    super.destroy();

    this.ri.destroy();
    this.rj.destroy();
    this.ni.destroy();
  }
}
ContactEquation.register("CANNON.ContactEquation");

export { ContactEquation };
