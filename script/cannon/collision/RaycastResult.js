import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class RaycastResult extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.RaycastResult"]) return;

    console.groupCollapsed(`[RaycastResult-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init() {
    super.init();

    this.rayFromWorld = new Vec3();
    this.rayToWorld = new Vec3();
    this.hitNormalWorld = new Vec3();
    this.hitPointWorld = new Vec3();
    this.hasHit = false;
    this.shape = null;
    this.body = null;
    this.hitFaceIndex = -1;
    this.distance = -1;
    this.shouldStop = false;
  }

  /**
   * Reset all result data.
   * @method reset
   */
  reset() {
    this.rayFromWorld.setZero();
    this.rayToWorld.setZero();
    this.hitNormalWorld.setZero();
    this.hitPointWorld.setZero();
    this.hasHit = false;
    this.shape = null;
    this.body = null;
    this.hitFaceIndex = -1;
    this.distance = -1;
    this.shouldStop = false;
  }

  /**
   * @method abort
   */
  abort() {
    this.shouldStop = true;
  }

  /**
   * @method set
   * @param {Vec3} rayFromWorld
   * @param {Vec3} rayToWorld
   * @param {Vec3} hitNormalWorld
   * @param {Vec3} hitPointWorld
   * @param {Shape} shape
   * @param {Body} body
   * @param {number} distance
   */
  set(
    rayFromWorld,
    rayToWorld,
    hitNormalWorld,
    hitPointWorld,
    shape,
    body,
    distance
  ) {
    this.rayFromWorld.copy(rayFromWorld);
    this.rayToWorld.copy(rayToWorld);
    this.hitNormalWorld.copy(hitNormalWorld);
    this.hitPointWorld.copy(hitPointWorld);
    this.shape = shape;
    this.body = body;
    this.distance = distance;
  }

  destroy() {
    super.destroy();

    this.rayFromWorld.destroy();
    this.rayToWorld.destroy();
    this.hitNormalWorld.destroy();
    this.hitPointWorld.destroy();
  }
}
RaycastResult.register("CANNON.RaycastResult");

export { RaycastResult };
