/* global Croquet */

class Shape extends Croquet.Model {
  init(options = {}) {
    super.init();
    
    this._id = Number(this.id.split('/M')[1]);

    this.type = options.type || 0;
    this.boundingSphereRadius = 0;
    this.collisionResponse = options.collisionResponse
      ? options.collisionResponse
      : true;
    this.collisionFilterGroup =
      options.collisionFilterGroup !== undefined
        ? options.collisionFilterGroup
        : 1;
    this.collisionFilterMask =
      options.collisionFilterMask !== undefined
        ? options.collisionFilterMask
        : -1;
    this.material = options.material ? options.material : null;
    this.body = null;
  }

  /**
   * Computes the bounding sphere radius. The result is stored in the property .boundingSphereRadius
   * @method updateBoundingSphereRadius
   */
  updateBoundingSphereRadius() {
    throw `computeBoundingSphereRadius() not implemented for shape type ${this.type}`;
  }

  /**
   * Get the volume of this shape
   * @method volume
   * @return {Number}
   */
  volume() {
    throw `volume() not implemented for shape type ${this.type}`;
  }

  /**
   * Calculates the inertia in the local frame for this shape.
   * @method calculateLocalInertia
   * @param {Number} mass
   * @param {Vec3} target
   * @see http://en.wikipedia.org/wiki/List_of_moments_of_inertia
   */
  calculateLocalInertia(mass, target) {
    throw `calculateLocalInertia() not implemented for shape type ${this.type}`;
  }

  calculateWorldAABB(pos, quat, min, max) {
    throw `calculateWorldAABB() not implemented for shape type ${this.type}`;
  }

  static get TYPES() {
    return {
      SPHERE: 1,
      PLANE: 2,
      BOX: 4,
      COMPOUND: 8,
      CONVEXPOLYHEDRON: 16,
      HEIGHTFIELD: 32,
      PARTICLE: 64,
      CYLINDER: 128,
      TRIMESH: 256
    };
  }
}
Shape.register("CANNON.Shape");

export { Shape };
