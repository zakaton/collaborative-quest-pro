import { Pool } from "../utils/Pool.js";
import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class Vec3Pool extends Pool {
  init() {
    super.init();
    this.type = "Vec3";
  }

  /**
   * Construct a vector
   * @method constructObject
   * @return {Vec3}
   */
  constructObject() {
    return new Vec3();
  }
}
Vec3Pool.register("CANNON.Vec3Pool");

export { Vec3Pool };
