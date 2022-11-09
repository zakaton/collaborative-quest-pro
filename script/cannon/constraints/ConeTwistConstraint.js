import { PointToPointConstraint } from "../constraints/PointToPointConstraint.js";
import { ConeEquation } from "../equations/ConeEquation.js";
import { RotationalEquation } from "../equations/RotationalEquation.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class ConeTwistConstraint extends PointToPointConstraint {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ConeTwistConstraint"]) return;

    console.groupCollapsed(
      `[ConeTwistConstraint-${this.id}] ${string}`,
      ...etc
    );
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const maxForce =
      typeof options.maxForce !== "undefined" ? options.maxForce : 1e6;

    const coneTwistConstraintOptions = options.coneTwistConstraintOptions || {};

    // Set pivot point in between
    const pivotA = coneTwistConstraintOptions.pivotA
      ? coneTwistConstraintOptions.pivotA.clone()
      : new Vec3();
    const pivotB = coneTwistConstraintOptions.pivotB
      ? coneTwistConstraintOptions.pivotB.clone()
      : new Vec3();

    const { bodyA, bodyB } = options;
    super.init({ bodyA, bodyB, pivotA, pivotB, maxForce });

    this.axisA = coneTwistConstraintOptions.axisA
      ? coneTwistConstraintOptions.axisA.clone()
      : new Vec3();
    this.axisB = coneTwistConstraintOptions.axisB
      ? coneTwistConstraintOptions.axisB.clone()
      : new Vec3();

    this.collideConnected = !!coneTwistConstraintOptions.collideConnected;

    this.angle =
      typeof coneTwistConstraintOptions.angle !== "undefined"
        ? coneTwistConstraintOptions.angle
        : 0;

    const c = (this.coneEquation = ConeEquation.create({
      bodyA,
      bodyB,
      coneEquationOptions: coneTwistConstraintOptions
    }));

    const t = (this.twistEquation = RotationalEquation.create({
      bodyA,
      bodyB,
      rotationalEquationOptions: coneTwistConstraintOptions
    }));
    this.twistAngle =
      typeof coneTwistConstraintOptions.twistAngle !== "undefined"
        ? coneTwistConstraintOptions.twistAngle
        : 0;

    // Make the cone equation push the bodies toward the cone axis, not outward
    c.maxForce = 0;
    c.minForce = -maxForce;

    // Make the twist equation add torque toward the initial position
    t.maxForce = 0;
    t.minForce = -maxForce;

    this.equations.push(c, t);
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const cone = this.coneEquation;
    const twist = this.twistEquation;

    super.update();

    // Update the axes to the cone constraint
    bodyA.vectorToWorldFrame(this.axisA, cone.axisA);
    bodyB.vectorToWorldFrame(this.axisB, cone.axisB);

    // Update the world axes in the twist constraint
    this.axisA.tangents(twist.axisA, twist.axisA);
    bodyA.vectorToWorldFrame(twist.axisA, twist.axisA);

    this.axisB.tangents(twist.axisB, twist.axisB);
    bodyB.vectorToWorldFrame(twist.axisB, twist.axisB);

    cone.angle = this.angle;
    twist.maxAngle = this.twistAngle;
  }

  destroy() {
    super.destroy();

    this.axisA.destroy();
    this.axisB.destroy();

    this.coneEquation.destroy();
    this.twistEquation.destroy();
  }
}
ConeTwistConstraint.register("CANNON.ConeTwistConstraint");

export { ConeTwistConstraint };
