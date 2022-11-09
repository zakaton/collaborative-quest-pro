import { Broadphase } from "../collision/Broadphase.js";

/* global Croquet */

class NaiveBroadphase extends Broadphase {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.NaiveBroadphase"]) return;

    console.groupCollapsed(`[NaiveBroadphase-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  /**
   * Get all the collision pairs in the physics world
   * @method collisionPairs
   * @param {World} world
   * @param {Array} pairs1
   * @param {Array} pairs2
   */
  collisionPairs(world, pairs1, pairs2) {
    const bodies = world.bodies;
    const n = bodies.length;
    let bi;
    let bj;
        
    // Naive N^2 ftw!
    for (let i = 0; i !== n; i++) {
      for (let j = 0; j !== i; j++) {
        bi = bodies[i];
        bj = bodies[j];

        if (!this.needBroadphaseCollision(bi, bj)) {
          continue;
        }

        this.intersectionTest(bi, bj, pairs1, pairs2);
      }
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
    for (let i = 0; i < world.bodies.length; i++) {
      const b = world.bodies[i];

      if (b.aabbNeedsUpdate) {
        b.updateAABB();
      }

      // Ugly hack until Body gets aabb
      if (b.aabb.overlaps(aabb)) {
        result.push(b);
      }
    }

    return result;
  }
}
NaiveBroadphase.register("CANNON.NaiveBroadphase");

export { NaiveBroadphase };
