// https://github.com/pmndrs/cannon-es/blob/master/src/math/JacobianElement.ts

import { Vec3 } from "../math/Vec3.js";

/* global Croquet */

class JacobianElement extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.JacobianElement"]) return;

    console.groupCollapsed(`[JacobianElement-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    super.init(...arguments);

    this.spatial = new Vec3();
    this.rotational = new Vec3();    
  }

  /**
   * Multiply with other JacobianElement
   */
  multiplyElement(element) {
    return (
      element.spatial.dot(this.spatial) +
      element.rotational.dot(this.rotational)
    );
  }

  /**
   * Multiply with two vectors
   */
  multiplyVectors(spatial, rotational) {
    return spatial.dot(this.spatial) + rotational.dot(this.rotational);
  }
}
JacobianElement.register("CANNON.JacobianElement");

export { JacobianElement };
