import { Vec3 } from "../math/Vec3.js";
import { Quaternion } from "../math/Quaternion.js";

/* global Croquet, ISLAND */

class Transform extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Transform"]) return;

    console.groupCollapsed(`[Transform-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    super.init(...arguments);

    this.position = new Vec3();
    this.quaternion = new Quaternion();

    if (options.position) {
      this.position.copy(options.position);
    }

    if (options.quaternion) {
      this.quaternion.copy(options.quaternion);
    }
  }

  static get tmpQuat() {
    const name = "CANNON.Transform.tmpQuat";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Quaternion();
      ISLAND.set(temp, name)
    }
    return temp;
  }

  /**
   * Get a global point in local transform coordinates.
   */
  pointToLocal(worldPoint, result) {
    return Transform.pointToLocalFrame(
      this.position,
      this.quaternion,
      worldPoint,
      result
    );
  }

  /**
   * Get a local point in global transform coordinates.
   */
  pointToWorld(localPoint, result) {
    return Transform.pointToWorldFrame(
      this.position,
      this.quaternion,
      localPoint,
      result
    );
  }

  vectorToWorldFrame(localVector, result = new Vec3()) {
    this.quaternion.vmult(localVector, result);
    return result;
  }

  static pointToLocalFrame(
    position,
    quaternion,
    worldPoint,
    result = new Vec3()
  ) {
    const tmpQuat = Transform.tmpQuat;
    worldPoint.vsub(position, result);
    quaternion.conjugate(tmpQuat);
    tmpQuat.vmult(result, result);
    return result;
  }

  static pointToWorldFrame(
    position,
    quaternion,
    localPoint,
    result = new Vec3()
  ) {
    quaternion.vmult(localPoint, result);
    result.vadd(position, result);
    return result;
  }

  static vectorToWorldFrame(quaternion, localVector, result = new Vec3()) {
    quaternion.vmult(localVector, result);
    return result;
  }

  static vectorToLocalFrame(
    position,
    quaternion,
    worldVector,
    result = new Vec3()
  ) {
    quaternion.w *= -1;
    quaternion.vmult(worldVector, result);
    quaternion.w *= -1;
    return result;
  }
}
Transform.register("CANNON.Transform");

export { Transform };
