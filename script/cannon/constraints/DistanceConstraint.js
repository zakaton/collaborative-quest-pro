import { Constraint } from "../constraints/Constraint.js";
import { ContactEquation } from "../equations/ContactEquation.js";

/* global Croquet */

class DistanceConstraint extends Constraint {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.DistanceConstraint"]) return;

    console.groupCollapsed(`[DistanceConstraint-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    const {bodyA, bodyB} = options;
        
    super.init({bodyA, bodyB, });

    let {distance} = options;
    if (typeof distance === "undefined") {
      distance = bodyA.position.distanceTo(bodyB.position);
    }

    this.distance = distance;
    const eq = (this.distanceEquation = ContactEquation.create({bodyA, bodyB}));
    this.equations.push(eq);
    

    
    const maxForce = ("maxForce" in options)? maxForce : 1e6;
    // Make it bidirectional
    eq.minForce = -maxForce;
    eq.maxForce = maxForce;
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const eq = this.distanceEquation;
    const halfDist = this.distance * 0.5;
    const normal = eq.ni;

    bodyB.position.vsub(bodyA.position, normal);
    normal.normalize();
    normal.scale(halfDist, eq.ri);
    normal.scale(-halfDist, eq.rj);
  }

  destroy() {
    super.destroy();
    this.distanceEquation.destroy();
  }
}
DistanceConstraint.register("CANNON.DistanceConstraint");

export { DistanceConstraint };
