import { Vec3 } from "../math/Vec3.js";
import { Mat3 } from "../math/Mat3.js";
import { Quaternion } from "../math/Quaternion.js";
import { AABB } from "../collision/AABB.js";
import { Box } from "../shapes/Box.js";

/* global Croquet, ISLAND */

class Body extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Body"]) return;

    console.groupCollapsed(`[Body-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  static get BODY_TYPES() {
    return {
      DYNAMIC: 1,
      STATIC: 2,
      KINEMATIC: 4
    };
  }

  static get BODY_SLEEP_STATES() {
    return {
      AWAKE: 0,
      SLEEPY: 1,
      SLEEPING: 2
    };
  }

  init(options = {}) {
    super.init();

    this._id = Number(this.id.split("/M")[1]);
    this.index = -1;
    this.world = null;
    this.preStep = null;
    this.postStep = null;
    this.vlambda = new Vec3();

    this.collisionFilterGroup =
      typeof options.collisionFilterGroup === "number"
        ? options.collisionFilterGroup
        : 1;
    this.collisionFilterMask =
      typeof options.collisionFilterMask === "number"
        ? options.collisionFilterMask
        : -1;
    this.collisionResponse =
      typeof options.collisionResponse === "boolean"
        ? options.collisionResponse
        : true;
    this.position = new Vec3();
    this.previousPosition = new Vec3();
    this.interpolatedPosition = new Vec3();
    this.initPosition = new Vec3();

    if (options.position) {
      this.position.copy(options.position);
      this.previousPosition.copy(options.position);
      this.interpolatedPosition.copy(options.position);
      this.initPosition.copy(options.position);
    }

    this.velocity = new Vec3();

    if (options.velocity) {
      this.velocity.copy(options.velocity);
    }

    this.initVelocity = new Vec3();
    this.force = new Vec3();
    const mass = typeof options.mass === "number" ? options.mass : 0;
    this.mass = mass;
    this.invMass = mass > 0 ? 1.0 / mass : 0;
    this.material = options.material || null;
    this.linearDamping =
      typeof options.linearDamping === "number" ? options.linearDamping : 0.01;

    this.type = mass <= 0.0 ? Body.STATIC : Body.DYNAMIC;

    if (typeof options.type === typeof Body.STATIC) {
      this.type = options.type;
    }

    this.allowSleep =
      typeof options.allowSleep !== "undefined" ? options.allowSleep : true;
    this.sleepState = Body.AWAKE;
    this.sleepSpeedLimit =
      typeof options.sleepSpeedLimit !== "undefined"
        ? options.sleepSpeedLimit
        : 0.1;
    this.sleepTimeLimit =
      typeof options.sleepTimeLimit !== "undefined"
        ? options.sleepTimeLimit
        : 1;
    this.timeLastSleepy = 0;
    this.wakeUpAfterNarrowphase = false;

    this.torque = new Vec3();
    this.quaternion = new Quaternion();
    this.initQuaternion = new Quaternion();
    this.previousQuaternion = new Quaternion();
    this.interpolatedQuaternion = new Quaternion();

    if (options.quaternion) {
      this.quaternion.copy(options.quaternion);
      this.initQuaternion.copy(options.quaternion);
      this.previousQuaternion.copy(options.quaternion);
      this.interpolatedQuaternion.copy(options.quaternion);
    }

    this.angularVelocity = new Vec3();

    if (options.angularVelocity) {
      this.angularVelocity.copy(options.angularVelocity);
    }

    this.initAngularVelocity = new Vec3();

    this.shapes = [];
    this.shapeOffsets = [];
    this.shapeOrientations = [];

    this.inertia = new Vec3();
    this.invInertia = new Vec3();
    this.invInertiaWorld = new Mat3();
    this.invMassSolve = 0;
    this.invInertiaSolve = new Vec3();
    this.invInertiaWorldSolve = new Mat3();

    this.fixedRotation =
      typeof options.fixedRotation !== "undefined"
        ? options.fixedRotation
        : false;
    this.angularDamping =
      typeof options.angularDamping !== "undefined"
        ? options.angularDamping
        : 0.01;

    this.linearFactor = new Vec3(1, 1, 1);

    if (options.linearFactor) {
      this.linearFactor.copy(options.linearFactor);
    }

    this.angularFactor = new Vec3(1, 1, 1);

    if (options.angularFactor) {
      this.angularFactor.copy(options.angularFactor);
    }

    this.aabb = new AABB();
    this.aabbNeedsUpdate = true;
    this.boundingRadius = 0;
    this.wlambda = new Vec3();
    this.isTrigger = Boolean(options.isTrigger);

    if (options.shape) {
      this.addShape(options.shape);
    }

    this.updateMassProperties();
  }

  static get tmpVec() {
    const name = "CANNON.Body.tmpVec";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get tmpQuat() {
    const name = "CANNON.Body.tmpQuat";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Quaternion();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get updateAABB_shapeAABB() {
    const name = "CANNON.Body.updateAABB_shapeAABB";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new AABB();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get uiw_m1() {
    const name = "CANNON.Body.uiw_m1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Mat3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get uiw_m2() {
    const name = "CANNON.Body.uiw_m2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Mat3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get uiw_m3() {
    const name = "CANNON.Body.uiw_m3";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Mat3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get Body_applyForce_rotForce() {
    const name = "CANNON.Body.Body_applyForce_rotForce";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get Body_applyLocalForce_worldForce() {
    const name = "CANNON.Body.Body_applyLocalForce_worldForce";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get Body_applyLocalForce_relativePointWorld() {
    const name = "CANNON.Body.Body_applyLocalForce_relativePointWorld";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get Body_applyImpulse_velo() {
    const name = "CANNON.Body.Body_applyImpulse_velo";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get Body_applyImpulse_rotVelo() {
    const name = "CANNON.Body.Body_applyImpulse_rotVelo";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get Body_applyLocalImpulse_worldImpulse() {
    const name = "CANNON.Body.Body_applyLocalImpulse_worldImpulse";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }
  static get Body_applyLocalImpulse_relativePoint() {
    const name = "CANNON.Body.Body_applyLocalImpulse_relativePoint";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  static get Body_updateMassProperties_halfExtents() {
    const name = "CANNON.Body.Body_updateMassProperties_halfExtents";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(name, temp);
    }
    return temp;
  }

  /**
   * Wake the body up.
   * @method wakeUp
   */
  wakeUp() {
    const prevState = this.sleepState;
    this.sleepState = Body.AWAKE;
    this.wakeUpAfterNarrowphase = false;
    if (prevState === Body.SLEEPING) {
      //this.dispatchEvent(Body.wakeupEvent);
      this.publish(this.id, "wakeup");
    }
  }

  /**
   * Force body sleep
   * @method sleep
   */
  sleep() {
    this.sleepState = Body.SLEEPING;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.wakeUpAfterNarrowphase = false;
  }

  /**
   * Called every timestep to update internal sleep timer and change sleep state if needed.
   * @method sleepTick
   * @param {Number} time The world time in seconds
   */
  sleepTick(time) {
    if (this.allowSleep) {
      const sleepState = this.sleepState;
      const speedSquared =
        this.velocity.lengthSquared() + this.angularVelocity.lengthSquared();
      const speedLimitSquared = this.sleepSpeedLimit ** 2;
      if (sleepState === Body.AWAKE && speedSquared < speedLimitSquared) {
        this.sleepState = Body.SLEEPY; // Sleepy
        this.timeLastSleepy = time;
        this.publish(this.id, "sleepy");
        //this.dispatchEvent(Body.sleepyEvent);
      } else if (
        sleepState === Body.SLEEPY &&
        speedSquared > speedLimitSquared
      ) {
        this.wakeUp(); // Wake up
      } else if (
        sleepState === Body.SLEEPY &&
        time - this.timeLastSleepy > this.sleepTimeLimit
      ) {
        this.sleep(); // Sleeping
        //this.dispatchEvent(Body.sleepEvent);
        this.publish(this.id, "sleep");
      }
    }
  }

  /**
   * If the body is sleeping, it should be immovable / have infinite mass during solve. We solve it by having a separate "solve mass".
   * @method updateSolveMassProperties
   */
  updateSolveMassProperties() {
    if (this.sleepState === Body.SLEEPING || this.type === Body.KINEMATIC) {
      this.invMassSolve = 0;
      this.invInertiaSolve.setZero();
      this.invInertiaWorldSolve.setZero();
    } else {
      this.invMassSolve = this.invMass;
      this.invInertiaSolve.copy(this.invInertia);
      this.invInertiaWorldSolve.copy(this.invInertiaWorld);
    }
  }

  /**
   * Convert a world point to local body frame.
   * @method pointToLocalFrame
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  pointToLocalFrame(worldPoint, result = new Vec3()) {
    worldPoint.vsub(this.position, result);
    this.quaternion.conjugate().vmult(result, result);
    return result;
  }

  /**
   * Convert a world vector to local body frame.
   * @method vectorToLocalFrame
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  vectorToLocalFrame(worldVector, result = new Vec3()) {
    this.quaternion.conjugate().vmult(worldVector, result);
    return result;
  }

  /**
   * Convert a local body point to world frame.
   * @method pointToWorldFrame
   * @param  {Vec3} localPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  pointToWorldFrame(localPoint, result = new Vec3()) {
    this.quaternion.vmult(localPoint, result);
    result.vadd(this.position, result);
    return result;
  }

  /**
   * Convert a local body point to world frame.
   * @method vectorToWorldFrame
   * @param  {Vec3} localVector
   * @param  {Vec3} result
   * @return {Vec3}
   */
  vectorToWorldFrame(localVector, result = new Vec3()) {
    this.quaternion.vmult(localVector, result);
    return result;
  }

  /**
   * Add a shape to the body with a local offset and orientation.
   * @method addShape
   * @param {Shape} shape
   * @param {Vec3} [_offset]
   * @param {Quaternion} [_orientation]
   * @return {Body} The body object, for chainability.
   */
  addShape(shape, _offset, _orientation) {
    const offset = new Vec3();
    const orientation = new Quaternion();

    if (_offset) {
      offset.copy(_offset);
    }
    if (_orientation) {
      orientation.copy(_orientation);
    }

    this.shapes.push(shape);
    this.shapeOffsets.push(offset);
    this.shapeOrientations.push(orientation);
    this.updateMassProperties();
    this.updateBoundingRadius();

    this.aabbNeedsUpdate = true;

    shape.body = this;

    return this;
  }

  /**
   * Remove a shape from the body.
   * @method removeShape
   * @param {Shape} shape
   * @return {Body} The body object, for chainability.
   */
  removeShape(shape) {
    const index = this.shapes.indexOf(shape);

    if (index === -1) {
      console.warn("Shape does not belong to the body");
      return this;
    }

    this.shapes.splice(index, 1);
    this.shapeOffsets.splice(index, 1);
    this.shapeOrientations.splice(index, 1);
    this.updateMassProperties();
    this.updateBoundingRadius();

    this.aabbNeedsUpdate = true;

    shape.body = null;

    return this;
  }

  /**
   * Update the bounding radius of the body. Should be done if any of the shapes are changed.
   * @method updateBoundingRadius
   */
  updateBoundingRadius() {
    const shapes = this.shapes;
    const shapeOffsets = this.shapeOffsets;
    const N = shapes.length;
    let radius = 0;

    for (let i = 0; i !== N; i++) {
      const shape = shapes[i];
      shape.updateBoundingSphereRadius();
      const offset = shapeOffsets[i].length();
      const r = shape.boundingSphereRadius;
      if (offset + r > radius) {
        radius = offset + r;
      }
    }

    this.boundingRadius = radius;
  }

  /**
   * Updates the .aabb
   * @method updateAABB
   */
  updateAABB() {
    const shapes = this.shapes;
    const shapeOffsets = this.shapeOffsets;
    const shapeOrientations = this.shapeOrientations;
    const N = shapes.length;
    const offset = Body.tmpVec;
    const orientation = Body.tmpQuat;
    const bodyQuat = this.quaternion;
    const aabb = this.aabb;
    const shapeAABB = Body.updateAABB_shapeAABB;

    for (let i = 0; i !== N; i++) {
      const shape = shapes[i];

      // Get shape world position
      bodyQuat.vmult(shapeOffsets[i], offset);
      offset.vadd(this.position, offset);

      // Get shape world quaternion
      bodyQuat.mult(shapeOrientations[i], orientation);

      // Get shape AABB
      shape.calculateWorldAABB(
        offset,
        orientation,
        shapeAABB.lowerBound,
        shapeAABB.upperBound
      );

      if (i === 0) {
        aabb.copy(shapeAABB);
      } else {
        aabb.extend(shapeAABB);
      }
    }

    this.aabbNeedsUpdate = false;
  }

  /**
   * Update .inertiaWorld and .invInertiaWorld
   * @method updateInertiaWorld
   */
  updateInertiaWorld(force) {
    const I = this.invInertia;
    if (I.x === I.y && I.y === I.z && !force) {
      // If inertia M = s*I, where I is identity and s a scalar, then
      //    R*M*R' = R*(s*I)*R' = s*R*I*R' = s*R*R' = s*I = M
      // where R is the rotation matrix.
      // In other words, we don't have to transform the inertia if all
      // inertia diagonal entries are equal.
    } else {
      const m1 = Body.uiw_m1;
      const m2 = Body.uiw_m2;
      const m3 = Body.uiw_m3;
      m1.setRotationFromQuaternion(this.quaternion);
      m1.transpose(m2);
      m1.scale(I, m1);
      m1.mmult(m2, this.invInertiaWorld);
    }
  }

  /**
   * Apply force to a point of the body. This could for example be a point on the Body surface.
   * Applying force this way will add to Body.force and Body.torque.
   * @method applyForce
   * @param  {Vec3} force The amount of force to add.
   * @param  {Vec3} [relativePoint] A point relative to the center of mass to apply the force on.
   */
  applyForce(force, relativePoint = new Vec3()) {
    // Needed?
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    if (this.sleepState === Body.SLEEPING) {
      this.wakeUp();
    }

    // Compute produced rotational force
    const rotForce = Body.Body_applyForce_rotForce;
    relativePoint.cross(force, rotForce);

    // Add linear force
    this.force.vadd(force, this.force);

    // Add rotational force
    this.torque.vadd(rotForce, this.torque);
  }

  /**
   * Apply force to a local point in the body.
   * @method applyLocalForce
   * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
   * @param  {Vec3} [localPoint] A local point in the body to apply the force on.
   */
  applyLocalForce(localForce, localPoint = new Vec3()) {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    const worldForce = Body.Body_applyLocalForce_worldForce;
    const relativePointWorld = Body.Body_applyLocalForce_relativePointWorld;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localForce, worldForce);
    this.vectorToWorldFrame(localPoint, relativePointWorld);

    this.applyForce(worldForce, relativePointWorld);
  }

  /**
   * Apply torque to the body.
   * @method applyTorque
   * @param  {Vec3} torque The amount of torque to add.
   */
  applyTorque(torque) {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    if (this.sleepState === Body.SLEEPING) {
      this.wakeUp();
    }

    // Add rotational force
    this.torque.vadd(torque, this.torque);
  }

  /**
   * Apply impulse to a point of the body. This could for example be a point on the Body surface.
   * An impulse is a force added to a body during a short period of time (impulse = force * time).
   * Impulses will be added to Body.velocity and Body.angularVelocity.
   * @method applyImpulse
   * @param  {Vec3} impulse The amount of impulse to add.
   * @param  {Vec3} relativePoint A point relative to the center of mass to apply the force on.
   */
  applyImpulse(impulse, relativePoint = new Vec3()) {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    if (this.sleepState === Body.SLEEPING) {
      this.wakeUp();
    }

    // Compute point position relative to the body center
    const r = relativePoint;

    // Compute produced central impulse velocity
    const velo = Body.Body_applyImpulse_velo;
    velo.copy(impulse);
    velo.scale(this.invMass, velo);

    // Add linear impulse
    this.velocity.vadd(velo, this.velocity);

    // Compute produced rotational impulse velocity
    const rotVelo = Body.Body_applyImpulse_rotVelo;
    r.cross(impulse, rotVelo);

    /*
     rotVelo.x *= this.invInertia.x;
     rotVelo.y *= this.invInertia.y;
     rotVelo.z *= this.invInertia.z;
     */
    this.invInertiaWorld.vmult(rotVelo, rotVelo);

    // Add rotational Impulse
    this.angularVelocity.vadd(rotVelo, this.angularVelocity);
  }

  /**
   * Apply locally-defined impulse to a local point in the body.
   * @method applyLocalImpulse
   * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
   * @param  {Vec3} localPoint A local point in the body to apply the force on.
   */
  applyLocalImpulse(localImpulse, localPoint = new Vec3()) {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    const worldImpulse = Body.Body_applyLocalImpulse_worldImpulse;
    const relativePointWorld = Body.Body_applyLocalImpulse_relativePoint;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localImpulse, worldImpulse);
    this.vectorToWorldFrame(localPoint, relativePointWorld);

    this.applyImpulse(worldImpulse, relativePointWorld);
  }

  /**
   * Should be called whenever you change the body shape or mass.
   * @method updateMassProperties
   */
  updateMassProperties() {
    const halfExtents = Body.Body_updateMassProperties_halfExtents;

    this.invMass = this.mass > 0 ? 1.0 / this.mass : 0;
    const I = this.inertia;
    const fixed = this.fixedRotation;

    // Approximate with AABB box
    this.updateAABB();
    halfExtents.set(
      (this.aabb.upperBound.x - this.aabb.lowerBound.x) / 2,
      (this.aabb.upperBound.y - this.aabb.lowerBound.y) / 2,
      (this.aabb.upperBound.z - this.aabb.lowerBound.z) / 2
    );
    Box.calculateInertia(halfExtents, this.mass, I);

    this.invInertia.set(
      I.x > 0 && !fixed ? 1.0 / I.x : 0,
      I.y > 0 && !fixed ? 1.0 / I.y : 0,
      I.z > 0 && !fixed ? 1.0 / I.z : 0
    );
    this.updateInertiaWorld(true);
  }

  /**
   * Get world velocity of a point in the body.
   * @method getVelocityAtWorldPoint
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3} The result vector.
   */
  getVelocityAtWorldPoint(worldPoint, result) {
    const r = new Vec3();
    worldPoint.vsub(this.position, r);
    this.angularVelocity.cross(r, result);
    this.velocity.vadd(result, result);
    return result;
  }

  /**
   * Move the body forward in time.
   * @param {number} dt Time step
   * @param {boolean} quatNormalize Set to true to normalize the body quaternion
   * @param {boolean} quatNormalizeFast If the quaternion should be normalized using "fast" quaternion normalization
   */
  integrate(dt, quatNormalize, quatNormalizeFast) {
    // Save previous position
    this.previousPosition.copy(this.position);
    this.previousQuaternion.copy(this.quaternion);

    if (
      !(this.type === Body.DYNAMIC || this.type === Body.KINEMATIC) ||
      this.sleepState === Body.SLEEPING
    ) {
      // Only for dynamic
      return;
    }

    const velo = this.velocity;
    const angularVelo = this.angularVelocity;
    const pos = this.position;
    const force = this.force;
    const torque = this.torque;
    const quat = this.quaternion;
    const invMass = this.invMass;
    const invInertia = this.invInertiaWorld;
    const linearFactor = this.linearFactor;

    const iMdt = invMass * dt;
    velo.x += force.x * iMdt * linearFactor.x;
    velo.y += force.y * iMdt * linearFactor.y;
    velo.z += force.z * iMdt * linearFactor.z;

    const e = invInertia.elements;
    const angularFactor = this.angularFactor;
    const tx = torque.x * angularFactor.x;
    const ty = torque.y * angularFactor.y;
    const tz = torque.z * angularFactor.z;
    angularVelo.x += dt * (e[0] * tx + e[1] * ty + e[2] * tz);
    angularVelo.y += dt * (e[3] * tx + e[4] * ty + e[5] * tz);
    angularVelo.z += dt * (e[6] * tx + e[7] * ty + e[8] * tz);

    // Use new velocity  - leap frog
    pos.x += velo.x * dt;
    pos.y += velo.y * dt;
    pos.z += velo.z * dt;

    quat.integrate(this.angularVelocity, dt, this.angularFactor, quat);

    if (quatNormalize) {
      if (quatNormalizeFast) {
        quat.normalizeFast();
      } else {
        quat.normalize();
      }
    }

    this.aabbNeedsUpdate = true;

    // Update world inertia
    this.updateInertiaWorld();
  }

  /**
   * Dispatched after two bodies collide. This event is dispatched on each
   * of the two bodies involved in the collision.
   * @event collide
   * @param {Body} body The body that was involved in the collision.
   * @param {ContactEquation} contact The details of the collision.
   */
  static get COLLIDE_EVENT_NAME() {
    return "collide";
  }

  /**
   * A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
   * @static
   * @property DYNAMIC
   * @type {Number}
   */
  static get DYNAMIC() {
    return 1;
  }

  /**
   * A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
   * @static
   * @property STATIC
   * @type {Number}
   */
  static get STATIC() {
    return 2;
  }

  /**
   * A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
   * @static
   * @property KINEMATIC
   * @type {Number}
   */
  static get KINEMATIC() {
    return 4;
  }

  static get AWAKE() {
    return this.BODY_SLEEP_STATES.AWAKE;
  }
  static get SLEEPY() {
    return this.BODY_SLEEP_STATES.SLEEPY;
  }
  static get SLEEPING() {
    return this.BODY_SLEEP_STATES.SLEEPING;
  }

  destroy() {
    super.destroy();
    this.shapes.forEach(shape => shape.destroy());
  }
}
Body.register("CANNON.Body");

export { Body };
