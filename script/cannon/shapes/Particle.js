import { Shape } from "../shapes/Shape.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class Particle extends Shape {
  init() {
    super.init({ type: Shape.TYPES.PARTICLE });
  }

  calculateLocalInertia(mass, target = new Vec3()) {
    target.set(0, 0, 0);
    return target;
  }

  volume() {
    return 0;
  }

  updateBoundingSphereRadius() {
    this.boundingSphereRadius = 0;
  }

  calculateWorldAABB(pos, quat, min, max) {
    // Get each axis max
    min.copy(pos);
    max.copy(pos);
  }
}
Particle.register("CANNON.Particle");

export { Particle };
