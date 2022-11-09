import { Shape } from "../shapes/Shape.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class Sphere extends Shape {
  init(options = {}) {
    super.init({ type: Shape.TYPES.SPHERE });

    this.radius = ("radius" in options) ? options.radius : 1.0;

    if (this.radius < 0) {
      throw new Error("The sphere radius cannot be negative.");
    }

    this.updateBoundingSphereRadius();
  }
  
  calculateLocalInertia(mass, target = new Vec3()) {
    const I = (2.0 * mass * this.radius * this.radius) / 5.0
    target.x = I
    target.y = I
    target.z = I
    return target
  }

  volume() {
    return (4.0 * Math.PI * Math.pow(this.radius, 3)) / 3.0
  }

  updateBoundingSphereRadius() {
    this.boundingSphereRadius = this.radius
  }

  calculateWorldAABB(pos, quat, min, max) {
    const r = this.radius
    const axes = ['x', 'y', 'z'];
    for (let i = 0; i < axes.length; i++) {
      const ax = axes[i]
      min[ax] = pos[ax] - r
      max[ax] = pos[ax] + r
    }
  }
}
Sphere.register("CANNON.Sphere");

export { Sphere };
