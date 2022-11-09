import { Shape } from "../shapes/Shape.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class Plane extends Shape {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Plane"]) return;

    console.groupCollapsed(`[Plane-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init() {
    super.init({ type: Shape.TYPES.PLANE });

    // World oriented normal
    this.worldNormal = new Vec3();
    this.worldNormalNeedsUpdate = true;

    this.boundingSphereRadius = Number.MAX_VALUE;
  }

  static get tempNormal() {
    const name = "CANNON.Plane.tempNormal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  computeWorldNormal(quat) {
    const n = this.worldNormal;
    n.set(0, 0, 1);
    quat.vmult(n, n);
    this.worldNormalNeedsUpdate = false;
  }

  calculateLocalInertia(mass, target = new Vec3()) {
    return target;
  }

  volume() {
    return (
      // The plane is infinite...
      Number.MAX_VALUE
    );
  }

  calculateWorldAABB(pos, quat, min, max) {
    const tempNormal = Plane.tempNormal;
    // The plane AABB is infinite, except if the normal is pointing along any axis
    tempNormal.set(0, 0, 1); // Default plane normal is z
    quat.vmult(tempNormal, tempNormal);
    const maxVal = Number.MAX_VALUE;
    min.set(-maxVal, -maxVal, -maxVal);
    max.set(maxVal, maxVal, maxVal);

    if (tempNormal.x === 1) {
      max.x = pos.x;
    } else if (tempNormal.x === -1) {
      min.x = pos.x;
    }

    if (tempNormal.y === 1) {
      max.y = pos.y;
    } else if (tempNormal.y === -1) {
      min.y = pos.y;
    }

    if (tempNormal.z === 1) {
      max.z = pos.z;
    } else if (tempNormal.z === -1) {
      min.z = pos.z;
    }
  }

  updateBoundingSphereRadius() {
    this.boundingSphereRadius = Number.MAX_VALUE;
  }
}
Plane.register("CANNON.Plane");

export { Plane };
