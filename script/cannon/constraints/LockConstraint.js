import { PointToPointConstraint } from "../constraints/PointToPointConstraint.js";
import { RotationalEquation } from "../equations/RotationalEquation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class LockConstraint extends PointToPointConstraint {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.LockConstraint"]) return;

    console.groupCollapsed(`[LockConstraint-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const lockConstraintOptions = options.lockConstraintOptions || {};

    const maxForce =
      typeof lockConstraintOptions.maxForce !== "undefined"
        ? lockConstraintOptions.maxForce
        : 1e6;

    const { bodyA, bodyB } = options;
    // Set pivot point in between
    const pivotA = new Vec3();
    const pivotB = new Vec3();
    const halfWay = new Vec3();
    bodyA.position.vadd(bodyB.position, halfWay);
    halfWay.scale(0.5, halfWay);
    bodyB.pointToLocalFrame(halfWay, pivotB);
    bodyA.pointToLocalFrame(halfWay, pivotA);

    super.init({ bodyA, pivotA, bodyB, pivotB, maxForce });

    // Store initial rotation of the bodies as unit vectors in the local body spaces
    this.xA = bodyA.vectorToLocalFrame(Vec3.UNIT_X);
    this.xB = bodyB.vectorToLocalFrame(Vec3.UNIT_X);
    this.yA = bodyA.vectorToLocalFrame(Vec3.UNIT_Y);
    this.yB = bodyB.vectorToLocalFrame(Vec3.UNIT_Y);
    this.zA = bodyA.vectorToLocalFrame(Vec3.UNIT_Z);
    this.zB = bodyB.vectorToLocalFrame(Vec3.UNIT_Z);

    // ...and the following rotational equations will keep all rotational DOF's in place
    const r1 = (this.rotationalEquation1 = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: lockConstraintOptions
    }));
    const r2 = (this.rotationalEquation2 = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: lockConstraintOptions
    }));
    const r3 = (this.rotationalEquation3 = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: lockConstraintOptions
    }));

    this.equations.push(r1, r2, r3);
  }

  static get LockConstraint_update_tmpVec1() {
    const name = "CANNON.LockConstraint.LockConstraint_update_tmpVec1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get LockConstraint_update_tmpVec2() {
    const name = "CANNON.LockConstraint.LockConstraint_update_tmpVec2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const motor = this.motorEquation;
    const r1 = this.rotationalEquation1;
    const r2 = this.rotationalEquation2;
    const r3 = this.rotationalEquation3;
    const worldAxisA = LockConstraint.LockConstraint_update_tmpVec1;
    const worldAxisB = LockConstraint.LockConstraint_update_tmpVec2;

    super.update();

    // These vector pairs must be orthogonal
    bodyA.vectorToWorldFrame(this.xA, r1.axisA);
    bodyB.vectorToWorldFrame(this.yB, r1.axisB);

    bodyA.vectorToWorldFrame(this.yA, r2.axisA);
    bodyB.vectorToWorldFrame(this.zB, r2.axisB);

    bodyA.vectorToWorldFrame(this.zA, r3.axisA);
    bodyB.vectorToWorldFrame(this.xB, r3.axisB);
  }

  destroy() {
    super.destroy();

    this.rotationalEquation1.destroy();
    this.rotationalEquation2.destroy();
    this.rotationalEquation3.destroy();

    this.xA.destroy();
    this.xB.destroy();
    this.yA.destroy();
    this.yB.destroy();
    this.zA.destroy();
    this.zB.destroy();
  }
}
LockConstraint.register("CANNON.LockConstraint");

export { LockConstraint };
