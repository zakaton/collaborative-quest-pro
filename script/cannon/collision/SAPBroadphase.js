import { Broadphase } from "../collision/Broadphase.js";

/* global Croquet */

class SAPBroadphase extends Broadphase {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.SAPBroadphase"]) return;

    console.groupCollapsed(`[SAPBroadphase-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    super.init();

    this.axisList = [];
    this.world = null;
    this.axisIndex = 0;

    const axisList = this.axisList;

    if (options.world) {
      this.setWorld(options.world);
    }
  }

  setWorld(world) {
    // Clear the old axis array
    this.axisList.length = 0;

    // Add all bodies from the new world
    for (let i = 0; i < world.bodies.length; i++) {
      this.axisList.push(world.bodies[i]);
    }

    this.world = world;
    this.dirty = true;
  }

  /**
   * Collect all collision pairs
   * @method collisionPairs
   * @param  {World} world
   * @param  {Array} p1
   * @param  {Array} p2
   */
  collisionPairs(world, p1, p2) {
    const bodies = this.axisList;
    const N = bodies.length;
    const axisIndex = this.axisIndex;
    let i;
    let j;

    if (this.dirty) {
      this.sortList();
      this.dirty = false;
    }

    // Look through the list
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];

      for (j = i + 1; j < N; j++) {
        const bj = bodies[j];

        if (!this.needBroadphaseCollision(bi, bj)) {
          continue;
        }

        if (!SAPBroadphase.checkBounds(bi, bj, axisIndex)) {
          break;
        }

        this.intersectionTest(bi, bj, p1, p2);
      }
    }
  }

  sortList() {
    const axisList = this.axisList;
    const axisIndex = this.axisIndex;
    const N = axisList.length;

    // Update AABBs
    for (let i = 0; i !== N; i++) {
      const bi = axisList[i];
      if (bi.aabbNeedsUpdate) {
        bi.updateAABB();
      }
    }

    // Sort the list
    if (axisIndex === 0) {
      SAPBroadphase.insertionSortX(axisList);
    } else if (axisIndex === 1) {
      SAPBroadphase.insertionSortY(axisList);
    } else if (axisIndex === 2) {
      SAPBroadphase.insertionSortZ(axisList);
    }
  }

  /**
   * Computes the variance of the body positions and estimates the best
   * axis to use. Will automatically set property .axisIndex.
   * @method autoDetectAxis
   */
  autoDetectAxis() {
    let sumX = 0;
    let sumX2 = 0;
    let sumY = 0;
    let sumY2 = 0;
    let sumZ = 0;
    let sumZ2 = 0;
    const bodies = this.axisList;
    const N = bodies.length;
    const invN = 1 / N;

    for (let i = 0; i !== N; i++) {
      const b = bodies[i];

      const centerX = b.position.x;
      sumX += centerX;
      sumX2 += centerX * centerX;

      const centerY = b.position.y;
      sumY += centerY;
      sumY2 += centerY * centerY;

      const centerZ = b.position.z;
      sumZ += centerZ;
      sumZ2 += centerZ * centerZ;
    }

    const varianceX = sumX2 - sumX * sumX * invN;
    const varianceY = sumY2 - sumY * sumY * invN;
    const varianceZ = sumZ2 - sumZ * sumZ * invN;

    if (varianceX > varianceY) {
      if (varianceX > varianceZ) {
        this.axisIndex = 0;
      } else {
        this.axisIndex = 2;
      }
    } else if (varianceY > varianceZ) {
      this.axisIndex = 1;
    } else {
      this.axisIndex = 2;
    }
  }

  /**
   * Returns all the bodies within an AABB.
   * @method aabbQuery
   * @param  {World} world
   * @param  {AABB} aabb
   * @param {array} result An array to store resulting bodies in.
   * @return {array}
   */
  aabbQuery(world, aabb, result = []) {
    if (this.dirty) {
      this.sortList();
      this.dirty = false;
    }

    const axisIndex = this.axisIndex;
    let axis = "x";
    if (axisIndex === 1) {
      axis = "y";
    }
    if (axisIndex === 2) {
      axis = "z";
    }

    const axisList = this.axisList;
    const lower = aabb.lowerBound[axis];
    const upper = aabb.upperBound[axis];
    for (let i = 0; i < axisList.length; i++) {
      const b = axisList[i];

      if (b.aabbNeedsUpdate) {
        b.updateAABB();
      }

      if (b.aabb.overlaps(aabb)) {
        result.push(b);
      }
    }

    return result;
  }

  static insertionSortX(a, b) {
    for (let i = 1, l = a.length; i < l; i++) {
      const v = a[i];
      let j;
      for (j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.x <= v.aabb.lowerBound.x) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = v;
    }
    return a;
  }

  static insertionSortY(a, b) {
    for (let i = 1, l = a.length; i < l; i++) {
      const v = a[i];
      let j;
      for (j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.y <= v.aabb.lowerBound.y) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = v;
    }
    return a;
  }

  static insertionSortZ(a, b) {
    for (let i = 1, l = a.length; i < l; i++) {
      const v = a[i];
      let j;
      for (j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.z <= v.aabb.lowerBound.z) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = v;
    }
    return a;
  }

  checkBounds(bi, bj, axisIndex) {
    let biPos;
    let bjPos;

    if (axisIndex === 0) {
      biPos = bi.position.x;
      bjPos = bj.position.x;
    } else if (axisIndex === 1) {
      biPos = bi.position.y;
      bjPos = bj.position.y;
    } else if (axisIndex === 2) {
      biPos = bi.position.z;
      bjPos = bj.position.z;
    }

    const ri = bi.boundingRadius,
      rj = bj.boundingRadius,
      // boundA1 = biPos - ri,
      boundA2 = biPos + ri,
      boundB1 = bjPos - rj;
    // boundB2 = bjPos + rj;

    return boundB1 < boundA2;
  }
}
SAPBroadphase.register("CANNON.SAPBroadphase");

export { SAPBroadphase };
