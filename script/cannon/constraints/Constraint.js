import { Utils } from "../utils/Utils.js";

/* global Croquet */

class Constraint extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Constraint"]) return;

    console.groupCollapsed(`[Constraint-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    super.init();
    
    const { bodyA, bodyB, constraintOptions } = options;

    constraintOptions = Utils.defaults(constraintOptions, {
      collideConnected: true,
      wakeUpBodies: true
    });

    this.equations = [];
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this._id = Number(this.id.split('/M')[1]);
    this.collideConnected = constraintOptions.collideConnected;

    if (constraintOptions.wakeUpBodies) {
      if (bodyA) {
        bodyA.wakeUp();
      }
      if (bodyB) {
        bodyB.wakeUp();
      }
    }
  }

  /**
   * Update all the equations with data.
   * @method update
   */
  update() {
    throw new Error(
      "method update() not implmemented in this Constraint subclass!"
    );
  }

  /**
   * Enables all equations in the constraint.
   * @method enable
   */
  enable() {
    const eqs = this.equations;
    for (let i = 0; i < eqs.length; i++) {
      eqs[i].enabled = true;
    }
  }

  /**
   * Disables all equations in the constraint.
   * @method disable
   */
  disable() {
    const eqs = this.equations;
    for (let i = 0; i < eqs.length; i++) {
      eqs[i].enabled = false;
    }
  }
}
Constraint.register("CANNON.Constraint");

export { Constraint };
