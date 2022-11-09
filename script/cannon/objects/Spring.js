import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class Spring extends Croquet.Model {
  init(options = {}) {
    super.init();

    const springOptions = options.springOptions || {};
    const { bodyA, bodyB } = options;
    this.restLength =
      typeof springOptions.restLength === "number"
        ? springOptions.restLength
        : 1;
    this.stiffness = springOptions.stiffness || 100;
    this.damping = springOptions.damping || 1;
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = new Vec3();
    this.localAnchorB = new Vec3();

    if (springOptions.localAnchorA) {
      this.localAnchorA.copy(springOptions.localAnchorA);
    }
    if (springOptions.localAnchorB) {
      this.localAnchorB.copy(springOptions.localAnchorB);
    }
    if (springOptions.worldAnchorA) {
      this.setWorldAnchorA(springOptions.worldAnchorA);
    }
    if (springOptions.worldAnchorB) {
      this.setWorldAnchorB(springOptions.worldAnchorB);
    }
  }

  static get applyForce_r() {
    const name = "CANNON.Spring.applyForce_r";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get applyForce_r_unit() {
    const name = "CANNON.Spring.applyForce_r_unit";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  
  static get applyForce_u() {
    const name = "CANNON.Spring.applyForce_u";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get applyForce_f() {
    const name = "CANNON.Spring.applyForce_f";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  
  static get applyForce_worldAnchorA() {
    const name = "CANNON.Spring.applyForce_worldAnchorA";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get applyForce_worldAnchorB() {
    const name = "CANNON.Spring.applyForce_worldAnchorB";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  
  static get applyForce_ri() {
    const name = "CANNON.Spring.applyForce_ri";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get applyForce_rj() {
    const name = "CANNON.Spring.applyForce_rj";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  
  static get applyForce_ri_x_f() {
    const name = "CANNON.Spring.applyForce_ri_x_f";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get applyForce_rj_x_f() {
    const name = "CANNON.Spring.applyForce_rj_x_f";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  
  static get applyForce_tmp() {
    const name = "CANNON.Spring.applyForce_tmp";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  /**
   * Set the anchor point on body A, using world coordinates.
   * @method setWorldAnchorA
   * @param {Vec3} worldAnchorA
   */
  setWorldAnchorA(worldAnchorA) {
    this.bodyA.pointToLocalFrame(worldAnchorA, this.localAnchorA);
  }

  /**
   * Set the anchor point on body B, using world coordinates.
   * @method setWorldAnchorB
   * @param {Vec3} worldAnchorB
   */
  setWorldAnchorB(worldAnchorB) {
    this.bodyB.pointToLocalFrame(worldAnchorB, this.localAnchorB);
  }

  /**
   * Get the anchor point on body A, in world coordinates.
   * @method getWorldAnchorA
   * @param {Vec3} result The vector to store the result in.
   */
  getWorldAnchorA(result) {
    this.bodyA.pointToWorldFrame(this.localAnchorA, result);
  }

  /**
   * Get the anchor point on body B, in world coordinates.
   * @method getWorldAnchorB
   * @param {Vec3} result The vector to store the result in.
   */
  getWorldAnchorB(result) {
    this.bodyB.pointToWorldFrame(this.localAnchorB, result);
  }

  /**
   * Apply the spring force to the connected bodies.
   * @method applyForce
   */
  applyForce() {
    const k = this.stiffness;
    const d = this.damping;
    const l = this.restLength;
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const r = Spring.applyForce_r;
    const r_unit = Spring.applyForce_r_unit;
    const u = Spring.applyForce_u;
    const f = Spring.applyForce_f;
    const tmp = Spring.applyForce_tmp;
    const worldAnchorA = Spring.applyForce_worldAnchorA;
    const worldAnchorB = Spring.applyForce_worldAnchorB;
    const ri = Spring.applyForce_ri;
    const rj = Spring.applyForce_rj;
    const ri_x_f = Spring.applyForce_ri_x_f;
    const rj_x_f = Spring.applyForce_rj_x_f;

    // Get world anchors
    this.getWorldAnchorA(worldAnchorA);
    this.getWorldAnchorB(worldAnchorB);

    // Get offset points
    worldAnchorA.vsub(bodyA.position, ri);
    worldAnchorB.vsub(bodyB.position, rj);

    // Compute distance vector between world anchor points
    worldAnchorB.vsub(worldAnchorA, r);
    const rlen = r.length();
    r_unit.copy(r);
    r_unit.normalize();

    // Compute relative velocity of the anchor points, u
    bodyB.velocity.vsub(bodyA.velocity, u);
    // Add rotational velocity

    bodyB.angularVelocity.cross(rj, tmp);
    u.vadd(tmp, u);
    bodyA.angularVelocity.cross(ri, tmp);
    u.vsub(tmp, u);

    // F = - k * ( x - L ) - D * ( u )
    r_unit.scale(-k * (rlen - l) - d * u.dot(r_unit), f);

    // Add forces to bodies
    bodyA.force.vsub(f, bodyA.force);
    bodyB.force.vadd(f, bodyB.force);

    // Angular force
    ri.cross(f, ri_x_f);
    rj.cross(f, rj_x_f);
    bodyA.torque.vsub(ri_x_f, bodyA.torque);
    bodyB.torque.vadd(rj_x_f, bodyB.torque);
  }
}
Spring.register("CANNON.Spring");

export { Spring };
