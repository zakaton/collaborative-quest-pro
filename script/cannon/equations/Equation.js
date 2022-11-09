import { JacobianElement } from "../math/JacobianElement.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class Equation extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Equation"]) return;

    console.groupCollapsed(`[Equation-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    super.init();

    this._id = Number(this.id.split("/M")[1]);

    const minForce = "minForce" in options ? options.minForce : -1e6;
    const maxForce = "maxForce" in options ? options.maxForce : 1e6;
    this.minForce = minForce;
    this.maxForce = maxForce;

    const { bi, bj } = options;
    this.bi = bi;
    this.bj = bj;
    this.a = 0.0; // SPOOK parameter
    this.b = 0.0; // SPOOK parameter
    this.eps = 0.0; // SPOOK parameter
    this.jacobianElementA = JacobianElement.create();
    this.jacobianElementB = JacobianElement.create();
    this.enabled = true;
    this.multiplier = 0;

    this.setSpookParams(1e7, 4, 1 / 60); // Set typical spook params
  }

  static get iMfi() {
    const name = "CANNON.Equation.iMfi";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get iMfj() {
    const name = "CANNON.Equation.iMfj";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get invIi_vmult_taui() {
    const name = "CANNON.Equation.invIi_vmult_taui";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get invIj_vmult_tauj() {
    const name = "CANNON.Equation.invIj_vmult_tauj";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get tmp() {
    const name = "CANNON.Equation.tmp";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }
  static get addToWlambda_temp() {
    const name = "CANNON.Equation.addToWlambda_temp";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  /**
   * Recalculates a,b,eps.
   * @method setSpookParams
   */
  setSpookParams(stiffness, relaxation, timeStep) {
    const d = relaxation;
    const k = stiffness;
    const h = timeStep;
    this.a = 4.0 / (h * (1 + 4 * d));
    this.b = (4.0 * d) / (1 + 4 * d);
    this.eps = 4.0 / (h * h * k * (1 + 4 * d));
  }

  /**
   * Computes the right hand side of the SPOOK equation
   * @method computeB
   * @return {Number}
   */
  computeB(a, b, h) {
    const GW = this.computeGW();
    const Gq = this.computeGq();
    const GiMf = this.computeGiMf();
    return -Gq * a - GW * b - GiMf * h;
  }

  /**
   * Computes G*q, where q are the generalized body coordinates
   * @method computeGq
   * @return {Number}
   */
  computeGq() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const xi = bi.position;
    const xj = bj.position;
    return GA.spatial.dot(xi) + GB.spatial.dot(xj);
  }

  /**
   * Computes G*W, where W are the body velocities
   * @method computeGW
   * @return {Number}
   */
  computeGW() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const vi = bi.velocity;
    const vj = bj.velocity;
    const wi = bi.angularVelocity;
    const wj = bj.angularVelocity;
    return GA.multiplyVectors(vi, wi) + GB.multiplyVectors(vj, wj);
  }

  /**
   * Computes G*Wlambda, where W are the body velocities
   * @method computeGWlambda
   * @return {Number}
   */
  computeGWlambda() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const vi = bi.vlambda;
    const vj = bj.vlambda;
    const wi = bi.wlambda;
    const wj = bj.wlambda;
    return GA.multiplyVectors(vi, wi) + GB.multiplyVectors(vj, wj);
  }

  computeGiMf() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const fi = bi.force;
    const ti = bi.torque;
    const fj = bj.force;
    const tj = bj.torque;
    const invMassi = bi.invMassSolve;
    const invMassj = bj.invMassSolve;

    fi.scale(invMassi, Equation.iMfi);
    fj.scale(invMassj, Equation.iMfj);

    bi.invInertiaWorldSolve.vmult(ti, Equation.invIi_vmult_taui);
    bj.invInertiaWorldSolve.vmult(tj, Equation.invIj_vmult_tauj);

    return (
      GA.multiplyVectors(Equation.iMfi, Equation.invIi_vmult_taui) +
      GB.multiplyVectors(Equation.iMfj, Equation.invIj_vmult_tauj)
    );
  }

  computeGiMGt() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const invMassi = bi.invMassSolve;
    const invMassj = bj.invMassSolve;
    const invIi = bi.invInertiaWorldSolve;
    const invIj = bj.invInertiaWorldSolve;
    let result = invMassi + invMassj;

    invIi.vmult(GA.rotational, Equation.tmp);
    result += Equation.tmp.dot(GA.rotational);

    invIj.vmult(GB.rotational, Equation.tmp);
    result += Equation.tmp.dot(GB.rotational);

    return result;
  }

  /**
   * Add constraint velocity to the bodies.
   * @method addToWlambda
   * @param {Number} deltalambda
   */
  addToWlambda(deltalambda) {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const temp = Equation.addToWlambda_temp;

    // Add to linear velocity
    // v_lambda += inv(M) * delta_lamba * G
    bi.vlambda.addScaledVector(
      bi.invMassSolve * deltalambda,
      GA.spatial,
      bi.vlambda
    );
    bj.vlambda.addScaledVector(
      bj.invMassSolve * deltalambda,
      GB.spatial,
      bj.vlambda
    );

    // Add to angular velocity
    bi.invInertiaWorldSolve.vmult(GA.rotational, temp);
    bi.wlambda.addScaledVector(deltalambda, temp, bi.wlambda);

    bj.invInertiaWorldSolve.vmult(GB.rotational, temp);
    bj.wlambda.addScaledVector(deltalambda, temp, bj.wlambda);
  }

  /**
   * Compute the denominator part of the SPOOK equation: C = G*inv(M)*G' + eps
   * @method computeInvC
   * @param  {Number} eps
   * @return {Number}
   */
  computeC() {
    return this.computeGiMGt() + this.eps;
  }

  destroy() {
    super.destroy();

    this.jacobianElementA.destroy();
    this.jacobianElementB.destroy();
  }
}
Equation.register("CANNON.Equation");

export { Equation };
