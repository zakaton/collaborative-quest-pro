import { Constraint } from "../constraints/Constraint.js";
import { ContactEquation } from "../equations/ContactEquation.js";

/* global Croquet */

class PointToPointConstraint extends Constraint {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.PointToPointConstraint"]) return;

    console.groupCollapsed(
      `[PointToPointConstraint-${this.id}] ${string}`,
      ...etc
    );
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    const { bodyA, bodyB } = options;
    super.init({ bodyA, bodyB });

    const { pivotA, pivotB } = options;

    // FIX - should these be cloned?
    this.pivotA = pivotA.clone();
    this.pivotB = pivotB.clone();

    const x = (this.equationX = ContactEquation.create({ bodyA, bodyB }));
    const y = (this.equationY = ContactEquation.create({ bodyA, bodyB }));
    const z = (this.equationZ = ContactEquation.create({ bodyA, bodyB }));

    // Equations to be fed to the solver
    this.equations.push(x, y, z);

    const { maxForce } = options;
    // Make the equations bidirectional
    x.minForce = y.minForce = z.minForce = -maxForce;
    x.maxForce = y.maxForce = z.maxForce = maxForce;

    x.ni.set(1, 0, 0);
    y.ni.set(0, 1, 0);
    z.ni.set(0, 0, 1);
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const x = this.equationX;
    const y = this.equationY;
    const z = this.equationZ;

    // Rotate the pivots to world space
    bodyA.quaternion.vmult(this.pivotA, x.ri);
    bodyB.quaternion.vmult(this.pivotB, x.rj);

    y.ri.copy(x.ri);
    y.rj.copy(x.rj);
    z.ri.copy(x.ri);
    z.rj.copy(x.rj);
  }

  destroy() {
    super.destroy();

    this.equationX.destroy();
    this.equationY.destroy();
    this.equationZ.destroy();

    this.pivotA.destroy();
    this.pivotB.destroy();
  }
}
PointToPointConstraint.register("CANNON.PointToPointConstraint");

export { PointToPointConstraint };
