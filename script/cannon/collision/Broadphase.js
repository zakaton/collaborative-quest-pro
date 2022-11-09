import { Body } from "../objects/Body.js";
import { Vec3 } from "../math/Vec3.js";
import { Quaternion } from "../math/Quaternion.js";

/* global Croquet, ISLAND */

class Broadphase extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Broadphase"]) return;

    console.groupCollapsed(`[Broadphase-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init() {
    super.init();

    this.log("Constructor start");

    this.world = null;
    this.useBoundingBoxes = false;
    this.dirty = true;

    // TEMP START
    this.Broadphase_makePairsUnique_temp = { keys: [] };

    this.Broadphase_makePairsUnique_p1 = [];
    this.Broadphase_makePairsUnique_p2 = [];

    this.log("Constructor stop");
  }

  static get Broadphase_makePairsUnique_temp() {
    const name = "CANNON.Broadphase.Broadphase_makePairsUnique_temp";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get Broadphase_collisionPairs_r() {
    const name = "CANNON.Broadphase.Broadphase_collisionPairs_r";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  static get bsc_dist() {
    const name = "CANNON.Broadphase.Broadphase_collisionPairs_quat";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp)
    }
    return temp;
  }

  /**
   * Get the collision pairs from the world
   * @method collisionPairs
   * @param {World} world The world to search in
   * @param {Array} p1 Empty array to be filled with body objects
   * @param {Array} p2 Empty array to be filled with body objects
   */
  collisionPairs(world, p1, p2) {
    throw new Error(
      "collisionPairs not implemented for this BroadPhase class!"
    );
  }

  /**
   * Check if a body pair needs to be intersection tested at all.
   * @method needBroadphaseCollision
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @return {bool}
   */
  needBroadphaseCollision(bodyA, bodyB) {
    // Check collision filter masks
    if (
      (bodyA.collisionFilterGroup & bodyB.collisionFilterMask) === 0 ||
      (bodyB.collisionFilterGroup & bodyA.collisionFilterMask) === 0
    ) {
      return false;
    }

    // Check types
    if (
      ((bodyA.type & Body.STATIC) !== 0 ||
        bodyA.sleepState === Body.SLEEPING) &&
      ((bodyB.type & Body.STATIC) !== 0 || bodyB.sleepState === Body.SLEEPING)
    ) {
      // Both bodies are static or sleeping. Skip.
      return false;
    }

    return true;
  }

  /**
   * Check if the bounding volumes of two bodies intersect.
   * @method intersectionTest
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {array} pairs1
   * @param {array} pairs2
   */
  intersectionTest(bodyA, bodyB, pairs1, pairs2) {
    if (this.useBoundingBoxes) {
      this.doBoundingBoxBroadphase(bodyA, bodyB, pairs1, pairs2);
    } else {
      this.doBoundingSphereBroadphase(bodyA, bodyB, pairs1, pairs2);
    }
  }

  /**
   * Check if the bounding spheres of two bodies are intersecting.
   * @method doBoundingSphereBroadphase
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {Array} pairs1 bodyA is appended to this array if intersection
   * @param {Array} pairs2 bodyB is appended to this array if intersection
   */
  doBoundingSphereBroadphase(bodyA, bodyB, pairs1, pairs2) {
    const r = Broadphase.Broadphase_collisionPairs_r;
    bodyB.position.vsub(bodyA.position, r);
    const boundingRadiusSum2 =
      (bodyA.boundingRadius + bodyB.boundingRadius) ** 2;
    const norm2 = r.lengthSquared();
    if (norm2 < boundingRadiusSum2) {
      pairs1.push(bodyA);
      pairs2.push(bodyB);
    }
  }

  /**
   * Check if the bounding boxes of two bodies are intersecting.
   * @method doBoundingBoxBroadphase
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {Array} pairs1
   * @param {Array} pairs2
   */
  doBoundingBoxBroadphase(bodyA, bodyB, pairs1, pairs2) {
    if (bodyA.aabbNeedsUpdate) {
      bodyA.updateAABB();
    }
    if (bodyB.aabbNeedsUpdate) {
      bodyB.updateAABB();
    }

    // Check AABB / AABB
    if (bodyA.aabb.overlaps(bodyB.aabb)) {
      pairs1.push(bodyA);
      pairs2.push(bodyB);
    }
  }

  /**
   * Removes duplicate pairs from the pair arrays.
   * @method makePairsUnique
   * @param {Array} pairs1
   * @param {Array} pairs2
   */
  makePairsUnique(pairs1, pairs2) {
    const t = this.Broadphase_makePairsUnique_temp;
    const p1 = this.Broadphase_makePairsUnique_p1;
    const p2 = this.Broadphase_makePairsUnique_p2;
    const N = pairs1.length;

    for (let i = 0; i !== N; i++) {
      p1[i] = pairs1[i];
      p2[i] = pairs2[i];
    }

    pairs1.length = 0;
    pairs2.length = 0;

    for (let i = 0; i !== N; i++) {
      const id1 = p1[i].id;
      const id2 = p2[i].id;
      const key = id1 < id2 ? `${id1},${id2}` : `${id2},${id1}`;
      t[key] = i;
      t.keys.push(key);
    }

    for (let i = 0; i !== t.keys.length; i++) {
      const key = t.keys.pop();
      const pairIndex = t[key];
      pairs1.push(p1[pairIndex]);
      pairs2.push(p2[pairIndex]);
      delete t[key];
    }
  }

  /**
   * To be implemented by subcasses
   * @method setWorld
   * @param {World} world
   */
  setWorld(world) {}

  /**
   * Check if the bounding spheres of two bodies overlap.
   * @static
   * @method boundingSphereCheck
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @return {boolean}
   */
  static boundingSphereCheck(bodyA, bodyB) {
    const dist = new Vec3(); // bsc_dist;
    bodyA.position.vsub(bodyB.position, dist);
    const sa = bodyA.shapes[0];
    const sb = bodyB.shapes[0];
    return (
      Math.pow(sa.boundingSphereRadius + sb.boundingSphereRadius, 2) >
      dist.lengthSquared()
    );
  }

  /**
   * Returns all the bodies within the AABB.
   * @method aabbQuery
   * @param  {World} world
   * @param  {AABB} aabb
   * @param  {array} result An array to store resulting bodies in.
   * @return {array}
   */
  aabbQuery(world, aabb, result) {
    console.warn(".aabbQuery is not implemented in this Broadphase subclass.");
    return [];
  }

  destroy() {
    super.destroy();

    this.Broadphase_makePairsUnique_p1.length = 0;
    this.Broadphase_makePairsUnique_p2.length = 0;
  }
}
Broadphase.register("CANNON.Broadphase");

export { Broadphase };
