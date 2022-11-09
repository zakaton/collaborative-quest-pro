import { PointToPointConstraint } from "../constraints/PointToPointConstraint.js";
import { RotationalEquation } from "../equations/RotationalEquation.js";
import { RotationalMotorEquation } from "../equations/RotationalMotorEquation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class HingeConstraint extends PointToPointConstraint {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.HingeConstraint"]) return;

    console.groupCollapsed(`[HingeConstraint-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const hingeConstraintOptions = options.hingeConstraintOptions || {};

    const maxForce =
      typeof hingeConstraintOptions.maxForce !== "undefined"
        ? hingeConstraintOptions.maxForce
        : 1e6;

    const pivotA = hingeConstraintOptions.pivotA
      ? hingeConstraintOptions.pivotA.clone()
      : new Vec3();
    const pivotB = hingeConstraintOptions.pivotB
      ? hingeConstraintOptions.pivotB.clone()
      : new Vec3();

    const { bodyA, bodyB } = options;

    super.init({ bodyA, pivotA, bodyB, pivotB, maxForce });

    const axisA = (this.axisA = hingeConstraintOptions.axisA
      ? hingeConstraintOptions.axisA.clone()
      : new Vec3(1, 0, 0));
    axisA.normalize();

    const axisB = (this.axisB = hingeConstraintOptions.axisB
      ? hingeConstraintOptions.axisB.clone()
      : new Vec3(1, 0, 0));
    axisB.normalize();

    this.collideConnected = !!hingeConstraintOptions.collideConnected;

    const rotational1 = (this.rotationalEquation1 = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: hingeConstraintOptions
    }));
    const rotational2 = (this.rotationalEquation2 = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: hingeConstraintOptions
    }));
    const motor = (this.motorEquation = RotationalMotorEquation.create({
      bodyA,
      bodyB,
      maxForce
    }));
    motor.enabled = false; // Not enabled by default

    // Equations to be fed to the solver
    this.equations.push(rotational1, rotational2, motor);
  }

  static get HingeConstraint_update_tmpVec1() {
    const name = "CANNON.HingeConstraint.HingeConstraint_update_tmpVec2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get HingeConstraint_update_tmpVec2() {
    const name = "CANNON.HingeConstraint.HingeConstraint_update_tmpVec2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  /**
   * @method enableMotor
   */
  enableMotor() {
    this.motorEquation.enabled = true;
  }

  /**
   * @method disableMotor
   */
  disableMotor() {
    this.motorEquation.enabled = false;
  }

  /**
   * @method setMotorSpeed
   * @param {number} speed
   */
  setMotorSpeed(speed) {
    this.motorEquation.targetVelocity = speed;
  }

  /**
   * @method setMotorMaxForce
   * @param {number} maxForce
   */
  setMotorMaxForce(maxForce) {
    this.motorEquation.maxForce = maxForce;
    this.motorEquation.minForce = -maxForce;
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const motor = this.motorEquation;
    const r1 = this.rotationalEquation1;
    const r2 = this.rotationalEquation2;
    const worldAxisA = HingeConstraint.HingeConstraint_update_tmpVec1;
    const worldAxisB = HingeConstraint.HingeConstraint_update_tmpVec2;

    const axisA = this.axisA;
    const axisB = this.axisB;

    super.update();

    // Get world axes
    bodyA.quaternion.vmult(axisA, worldAxisA);
    bodyB.quaternion.vmult(axisB, worldAxisB);

    worldAxisA.tangents(r1.axisA, r2.axisA);
    r1.axisB.copy(worldAxisB);
    r2.axisB.copy(worldAxisB);

    if (this.motorEquation.enabled) {
      bodyA.quaternion.vmult(this.axisA, motor.axisA);
      bodyB.quaternion.vmult(this.axisB, motor.axisB);
    }
  }

  destroy() {
    super.destroy();

    this.rotationalEquation1.destroy();
    this.rotationalEquation2.destroy();
    this.motorEquation.destroy();
  }
}
HingeConstraint.register("CANNON.HingeConstraint");

export { HingeConstraint };
