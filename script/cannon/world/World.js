// https://github.com/pmndrs/cannon-es/blob/master/src/world/World.ts

import { GSSolver } from "../solver/GSSolver.js";
import { NaiveBroadphase } from "../collision/NaiveBroadphase.js";
import { Narrowphase } from "../world/Narrowphase.js";
import { Vec3 } from "../math/Vec3.js";
import { Mat3 } from "../math/Mat3.js";
import { Quaternion } from "../math/Quaternion.js";
import { Material } from "../material/Material.js";
import { ContactMaterial } from "../material/ContactMaterial.js";
import { ArrayCollisionMatrix } from "../collision/ArrayCollisionMatrix.js";
import { OverlapKeeper } from "../collision/OverlapKeeper.js";
import { TupleDictionary } from "../utils/TupleDictionary.js";
import { RaycastResult } from "../collision/RaycastResult.js";
import { Ray } from "../collision/Ray.js";
import { AABB } from "../collision/AABB.js";
import { Body } from "../objects/Body.js";

/* global Croquet */

/**
 * The physics world
 * @class World
 * @constructor
 * @extends EventTarget
 * @param {object} [options]
 * @param {Vec3} [options.gravity]
 * @param {boolean} [options.allowSleep]
 * @param {Broadphase} [options.broadphase]
 * @param {Solver} [options.solver]
 * @param {boolean} [options.quatNormalizeFast]
 * @param {number} [options.quatNormalizeSkip]
 */

class World extends Croquet.Model {
  init(options = {}) {
    super.init(...arguments);

    this.dt = -1;
    this.allowSleep = !!options.allowSleep;
    this.contacts = [];
    this.frictionEquations = [];
    this.quatNormalizeSkip =
      options.quatNormalizeSkip !== undefined ? options.quatNormalizeSkip : 0;
    this.quatNormalizeFast =
      options.quatNormalizeFast !== undefined
        ? options.quatNormalizeFast
        : false;
    this.time = 0.0;
    this.stepnumber = 0;
    this.default_dt = 1 / 60;
    this.nextId = 0;
    this.gravity = new Vec3();

    if (options.gravity) {
      this.gravity.copy(options.gravity);
    }

    this.broadphase =
      options.broadphase !== undefined
        ? options.broadphase
        : NaiveBroadphase.create();
    this.bodies = [];
    this.hasActiveBodies = false;
    this.solver =
      options.solver !== undefined ? options.solver : GSSolver.create();
    this.constraints = [];
    this.narrowphase = Narrowphase.create({ world: this });
    this.collisionMatrix = ArrayCollisionMatrix.create();
    this.collisionMatrixPrevious = ArrayCollisionMatrix.create();
    this.bodyOverlapKeeper = OverlapKeeper.create();
    this.shapeOverlapKeeper = OverlapKeeper.create();
    this.materials = [];
    this.contactmaterials = [];
    this.contactMaterialTable = new TupleDictionary();
    this.defaultMaterial = Material.create("default");
    this.defaultContactMaterial = ContactMaterial.create({
      m1: this.defaultMaterial,
      m2: this.defaultMaterial,
      contactMaterialOptions: {
        friction: 0.3,
        restitution: 0.0
      }
    });
    this.doProfiling = false;
    this.profile = {
      solve: 0,
      makeContactConstraints: 0,
      broadphase: 0,
      integrate: 0,
      narrowphase: 0
    };

    this.accumulator = 0;
    this.subsystems = [];
    this.idToBodyMap = {};
    this.broadphase.setWorld(this);

    // Temp stuff
    this.tmpRay = Ray.create();

    // Pools for unused objects
    this.World_step_oldContacts = [];
    this.World_step_frictionEquationPool = [];

    // Reusable arrays for collision pairs
    this.World_step_p1 = [];
    this.World_step_p2 = [];

    this.additions = [];
    this.removals = [];
  }

  static types() {
    return {
      "CANNON.TupleDictionary": {
        cls: TupleDictionary,
        write: tupleDictionary => TupleDictionary.write(tupleDictionary),
        read: string => TupleDictionary.read(string)
      },
      "CANNON.Vec3": {
        cls: Vec3,
        write: vec3 => Vec3.write(vec3),
        read: string => Vec3.read(string)
      },
      "CANNON.Mat3": {
        cls: Mat3,
        write: mat3 => Mat3.write(mat3),
        read: string => Mat3.read(string)
      },
      "CANNON.Quaternion": {
        cls: Quaternion,
        write: quaternion => Quaternion.write(quaternion),
        read: string => Quaternion.read(string)
      },
      "CANNON.AABB": {
        cls: AABB,
        write: aabb => AABB.write(aabb),
        read: string => AABB.read(string)
      }
    };
  }

  /**
   * Get the contact material between materials m1 and m2
   * @method getContactMaterial
   * @param {Material} m1
   * @param {Material} m2
   * @return {ContactMaterial} The contact material if it was found.
   */

  /**
   * Get the contact material between materials m1 and m2
   * @method getContactMaterial
   * @param {Material} m1
   * @param {Material} m2
   * @return {ContactMaterial} The contact material if it was found.
   */
  getContactMaterial(m1, m2) {
    return this.contactMaterialTable.get(m1._id, m2._id);
  }

  /**
   * Get number of objects in the world.
   * @method numObjects
   * @return {Number}
   * @deprecated
   */
  numObjects() {
    return this.bodies.length;
  }

  /**
   * Store old collision state info
   * @method collisionMatrixTick
   */
  collisionMatrixTick() {
    const temp = this.collisionMatrixPrevious;
    this.collisionMatrixPrevious = this.collisionMatrix;
    this.collisionMatrix = temp;
    this.collisionMatrix.reset();

    this.bodyOverlapKeeper.tick();
    this.shapeOverlapKeeper.tick();
  }

  /**
   * Add a constraint to the simulation.
   * @method addConstraint
   * @param {Constraint} c
   */
  addConstraint(c) {
    this.constraints.push(c);
  }

  /**
   * Removes a constraint
   * @method removeConstraint
   * @param {Constraint} c
   */
  removeConstraint(c) {
    const idx = this.constraints.indexOf(c);
    if (idx !== -1) {
      this.constraints.splice(idx, 1);
    }
  }

  /**
   * Raycast test
   * @method rayTest
   * @param {Vec3} from
   * @param {Vec3} to
   * @param {RaycastResult} result
   * @deprecated Use .raycastAll, .raycastClosest or .raycastAny instead.
   */
  rayTest(from, to, result) {
    if (result instanceof RaycastResult) {
      // Do raycastClosest
      this.raycastClosest(from, to, { skipBackfaces: true }, result);
    } else {
      // Do raycastAll
      this.raycastAll(from, to, { skipBackfaces: true }, result);
    }
  }

  /**
   * Ray cast against all bodies. The provided callback will be executed for each hit with a RaycastResult as single argument.
   * @method raycastAll
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {Function} callback
   * @return {boolean} True if any body was hit.
   */
  raycastAll(from, to, options = {}, callback) {
    // TODO - fix ray.callback isue
    options.mode = Ray.ALL;
    options.from = from;
    options.to = to;
    options.callback = callback;
    return this.tmpRay.intersectWorld(this, options);
  }

  /**
   * Ray cast, and stop at the first result. Note that the order is random - but the method is fast.
   * @method raycastAny
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {RaycastResult} result
   * @return {boolean} True if any body was hit.
   */
  raycastAny(from, to, options = {}, result) {
    options.mode = Ray.ANY;
    options.from = from;
    options.to = to;
    options.result = result;
    return this.tmpRay.intersectWorld(this, options);
  }

  /**
   * Ray cast, and return information of the closest hit.
   * @method raycastClosest
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {RaycastResult} result
   * @return {boolean} True if any body was hit.
   */
  raycastClosest(from, to, options = {}, result) {
    options.mode = Ray.CLOSEST;
    options.from = from;
    options.to = to;
    options.result = result;
    return this.tmpRay.intersectWorld(this, options);
  }

  /**
   * Add a rigid body to the simulation.
   * @method add
   * @param {Body} body
   * @todo If the simulation has not yet started, why recrete and copy arrays for each body? Accumulate in dynamic arrays in this case.
   * @todo Adding an array of bodies should be possible. This would save some loops too
   */
  addBody(body) {
    if (this.bodies.includes(body)) {
      return;
    }
    body.index = this.bodies.length;
    this.bodies.push(body);
    body.world = this;
    body.initPosition.copy(body.position);
    body.initVelocity.copy(body.velocity);
    body.timeLastSleepy = this.time;
    if (body instanceof Body) {
      body.initAngularVelocity.copy(body.angularVelocity);
      body.initQuaternion.copy(body.quaternion);
    }
    this.collisionMatrix.setNumObjects(this.bodies.length);
    this.idToBodyMap[body._id] = body;
    this.publish("cannon", "addBody", body);
  }

  /**
   * Remove a rigid body from the simulation.
   * @method remove
   * @param {Body} body
   */
  removeBody(body) {
    body.world = null;
    const n = this.bodies.length - 1;
    const bodies = this.bodies;
    const idx = bodies.indexOf(body);
    if (idx !== -1) {
      bodies.splice(idx, 1); // Todo: should use a garbage free method

      // Recompute index
      for (let i = 0; i !== bodies.length; i++) {
        bodies[i].index = i;
      }

      this.collisionMatrix.setNumObjects(n);
      delete this.idToBodyMap[body._id];
      this.publish("cannon", "removeBody", body);
    }
  }

  getBodyById(id) {
    return this.idToBodyMap[id];
  }

  // TODO Make a faster map
  getShapeById(id) {
    const bodies = this.bodies;
    for (let i = 0, bl = bodies.length; i < bl; i++) {
      const shapes = bodies[i].shapes;
      for (let j = 0, sl = shapes.length; j < sl; j++) {
        const shape = shapes[j];
        if (shape._id === id) {
          return shape;
        }
      }
    }
  }

  /**
   * Adds a material to the World.
   * @method addMaterial
   * @param {Material} m
   * @todo Necessary?
   */
  addMaterial(m) {
    this.materials.push(m);
  }

  /**
   * Adds a contact material to the World
   * @method addContactMaterial
   * @param {ContactMaterial} cmat
   */
  addContactMaterial(cmat) {
    // Add contact material
    this.contactmaterials.push(cmat);

    // Add current contact material to the material table
    this.contactMaterialTable.set(
      cmat.materials[0]._id,
      cmat.materials[1]._id,
      cmat
    );
  }

  /**
   * Step the physics world forward in time.
   *
   * There are two modes. The simple mode is fixed timestepping without interpolation. In this case you only use the first argument. The second case uses interpolation. In that you also provide the time since the function was last used, as well as the maximum fixed timesteps to take.
   *
   * @method step
   * @param {Number} dt                       The fixed time step size to use.
   * @param {Number} [timeSinceLastCalled]    The time elapsed since the function was last called.
   * @param {Number} [maxSubSteps=10]         Maximum number of fixed steps to take per function call.
   *
   * @example
   *     // fixed timestepping without interpolation
   *     world.step(1/60);
   *
   * @see http://bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
   */
  step(dt, timeSinceLastCalled, maxSubSteps = 10) {
    if (timeSinceLastCalled === undefined) {
      // Fixed, simple stepping

      this.internalStep(dt);

      // Increment time
      this.time += dt;
    } else {
      this.accumulator += timeSinceLastCalled;

      const t0 = this.now();
      let substeps = 0;
      while (this.accumulator >= dt && substeps < maxSubSteps) {
        // Do fixed steps to catch up
        this.internalStep(dt);
        this.accumulator -= dt;
        substeps++;
        if (this.now() - t0 > dt * 1000) {
          // The framerate is not interactive anymore.
          // We are below the target framerate.
          // Better bail out.
          break;
        }
      }

      // Remove the excess accumulator, since we may not
      // have had enough substeps available to catch up
      this.accumulator = this.accumulator % dt;

      const t = this.accumulator / dt;
      for (let j = 0; j !== this.bodies.length; j++) {
        const b = this.bodies[j];
        b.previousPosition.lerp(b.position, t, b.interpolatedPosition);
        b.previousQuaternion.slerp(b.quaternion, t, b.interpolatedQuaternion);
        b.previousQuaternion.normalize();
      }
      this.time += timeSinceLastCalled;
    }
  }

  internalStep(dt) {
    this.dt = dt;

    const world = this;
    const that = this;
    const contacts = this.contacts;
    const p1 = this.World_step_p1;
    const p2 = this.World_step_p2;
    const N = this.numObjects();
    const bodies = this.bodies;
    const solver = this.solver;
    const gravity = this.gravity;
    const doProfiling = this.doProfiling;
    const profile = this.profile;
    const DYNAMIC = Body.DYNAMIC;
    let profilingStart = -Infinity;
    const constraints = this.constraints;
    const frictionEquationPool = this.World_step_frictionEquationPool;
    const gnorm = gravity.length();
    const gx = gravity.x;
    const gy = gravity.y;
    const gz = gravity.z;
    let i = 0;

    if (doProfiling) {
      profilingStart = this.now();
    }

    // Add gravity to all objects
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];
      if (bi.type === DYNAMIC) {
        // Only for dynamic bodies
        const f = bi.force;
        const m = bi.mass;
        f.x += m * gx;
        f.y += m * gy;
        f.z += m * gz;
      }
    }

    // Update subsystems
    for (
      let i = 0, Nsubsystems = this.subsystems.length;
      i !== Nsubsystems;
      i++
    ) {
      this.subsystems[i].update();
    }

    // Collision detection
    if (doProfiling) {
      profilingStart = this.now();
    }
    p1.length = 0; // Clean up pair arrays from last step
    p2.length = 0;
    this.broadphase.collisionPairs(this, p1, p2);
    if (doProfiling) {
      profile.broadphase = this.now() - profilingStart;
    }

    // Remove constrained pairs with collideConnected == false
    let Nconstraints = constraints.length;
    for (i = 0; i !== Nconstraints; i++) {
      const c = constraints[i];
      if (!c.collideConnected) {
        for (let j = p1.length - 1; j >= 0; j -= 1) {
          if (
            (c.bodyA === p1[j] && c.bodyB === p2[j]) ||
            (c.bodyB === p1[j] && c.bodyA === p2[j])
          ) {
            p1.splice(j, 1);
            p2.splice(j, 1);
          }
        }
      }
    }

    this.collisionMatrixTick();

    // Generate contacts
    if (doProfiling) {
      profilingStart = this.now();
    }
    const oldcontacts = this.World_step_oldContacts;
    const NoldContacts = contacts.length;

    for (i = 0; i !== NoldContacts; i++) {
      oldcontacts.push(contacts[i]);
    }
    contacts.length = 0;

    // Transfer FrictionEquation from current list to the pool for reuse
    const NoldFrictionEquations = this.frictionEquations.length;
    for (i = 0; i !== NoldFrictionEquations; i++) {
      frictionEquationPool.push(this.frictionEquations[i]);
    }
    this.frictionEquations.length = 0;

    this.narrowphase.getContacts(
      p1,
      p2,
      this,
      contacts,
      oldcontacts, // To be reused
      this.frictionEquations,
      frictionEquationPool
    );

    if (doProfiling) {
      profile.narrowphase = this.now() - profilingStart;
    }

    // Loop over all collisions
    if (doProfiling) {
      profilingStart = this.now();
    }

    // Add all friction eqs
    for (i = 0; i < this.frictionEquations.length; i++) {
      solver.addEquation(this.frictionEquations[i]);
    }

    const ncontacts = contacts.length;
    for (let k = 0; k !== ncontacts; k++) {
      // Current contact
      const c = contacts[k];

      // Get current collision indices
      const bi = c.bi;

      const bj = c.bj;
      const si = c.si;
      const sj = c.sj;

      // Get collision properties
      let cm;
      if (bi.material && bj.material) {
        cm =
          this.getContactMaterial(bi.material, bj.material) ||
          this.defaultContactMaterial;
      } else {
        cm = this.defaultContactMaterial;
      }

      // c.enabled = bi.collisionResponse && bj.collisionResponse && si.collisionResponse && sj.collisionResponse;

      let mu = cm.friction;
      // c.restitution = cm.restitution;

      // If friction or restitution were specified in the material, use them
      if (bi.material && bj.material) {
        if (bi.material.friction >= 0 && bj.material.friction >= 0) {
          mu = bi.material.friction * bj.material.friction;
        }

        if (bi.material.restitution >= 0 && bj.material.restitution >= 0) {
          c.restitution = bi.material.restitution * bj.material.restitution;
        }
      }

      // c.setSpookParams(
      //           cm.contactEquationStiffness,
      //           cm.contactEquationRelaxation,
      //           dt
      //       );

      solver.addEquation(c);

      // // Add friction constraint equation
      // if(mu > 0){

      // 	// Create 2 tangent equations
      // 	const mug = mu * gnorm;
      // 	const reducedMass = (bi.invMass + bj.invMass);
      // 	if(reducedMass > 0){
      // 		reducedMass = 1/reducedMass;
      // 	}
      // 	const pool = frictionEquationPool;
      // 	const c1 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
      // 	const c2 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
      // 	this.frictionEquations.push(c1, c2);

      // 	c1.bi = c2.bi = bi;
      // 	c1.bj = c2.bj = bj;
      // 	c1.minForce = c2.minForce = -mug*reducedMass;
      // 	c1.maxForce = c2.maxForce = mug*reducedMass;

      // 	// Copy over the relative vectors
      // 	c1.ri.copy(c.ri);
      // 	c1.rj.copy(c.rj);
      // 	c2.ri.copy(c.ri);
      // 	c2.rj.copy(c.rj);

      // 	// Construct tangents
      // 	c.ni.tangents(c1.t, c2.t);

      //           // Set spook params
      //           c1.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);
      //           c2.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);

      //           c1.enabled = c2.enabled = c.enabled;

      // 	// Add equations to solver
      // 	solver.addEquation(c1);
      // 	solver.addEquation(c2);
      // }

      if (
        bi.allowSleep &&
        bi.type === Body.DYNAMIC &&
        bi.sleepState === Body.SLEEPING &&
        bj.sleepState === Body.AWAKE &&
        bj.type !== Body.STATIC
      ) {
        const speedSquaredB =
          bj.velocity.lengthSquared() + bj.angularVelocity.lengthSquared();
        const speedLimitSquaredB = bj.sleepSpeedLimit ** 2;
        if (speedSquaredB >= speedLimitSquaredB * 2) {
          bi.wakeUpAfterNarrowphase = true;
        }
      }

      if (
        bj.allowSleep &&
        bj.type === Body.DYNAMIC &&
        bj.sleepState === Body.SLEEPING &&
        bi.sleepState === Body.AWAKE &&
        bi.type !== Body.STATIC
      ) {
        const speedSquaredA =
          bi.velocity.lengthSquared() + bi.angularVelocity.lengthSquared();
        const speedLimitSquaredA = bi.sleepSpeedLimit ** 2;
        if (speedSquaredA >= speedLimitSquaredA * 2) {
          bj.wakeUpAfterNarrowphase = true;
        }
      }

      // Now we know that i and j are in contact. Set collision matrix state
      this.collisionMatrix.set(bi, bj, true);

      if (!this.collisionMatrixPrevious.get(bi, bj)) {
        // First contact!
        this.publish(bi.id, "collide-event", {
          type: typeof Body.COLLIDE_EVENT_NAME,
          body: bj,
          contact: c
        });

        this.publish(bj.id, "collide-event", {
          type: typeof Body.COLLIDE_EVENT_NAME,
          body: bi,
          contact: c
        });
      }

      this.bodyOverlapKeeper.set(bi._id, bj._id);
      this.shapeOverlapKeeper.set(si._id, sj._id);
    }

    this.publishContactEvents();

    if (doProfiling) {
      profile.makeContactConstraints = this.now() - profilingStart;
      profilingStart = this.now();
    }

    // Wake up bodies
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];
      if (bi.wakeUpAfterNarrowphase) {
        bi.wakeUp();
        bi.wakeUpAfterNarrowphase = false;
      }
    }

    // Add user-added constraints
    Nconstraints = constraints.length;
    for (i = 0; i !== Nconstraints; i++) {
      const c = constraints[i];
      c.update();
      for (let j = 0, Neq = c.equations.length; j !== Neq; j++) {
        const eq = c.equations[j];
        solver.addEquation(eq);
      }
    }

    // Solve the constrained system
    solver.solve(dt, this);

    if (doProfiling) {
      profile.solve = this.now() - profilingStart;
    }

    // Remove all contacts from solver
    solver.removeAllEquations();

    // Apply damping, see http://code.google.com/p/bullet/issues/detail?id=74 for details
    const pow = Math.pow;
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];
      if (bi.type & DYNAMIC) {
        // Only for dynamic bodies
        const ld = pow(1.0 - bi.linearDamping, dt);
        const v = bi.velocity;
        v.scale(ld, v);
        const av = bi.angularVelocity;
        if (av) {
          const ad = pow(1.0 - bi.angularDamping, dt);
          av.scale(ad, av);
        }
      }
    }

    //this.dispatchEvent(World_step_preStepEvent);
    this.publish("cannon", "preStep");

    // Invoke pre-step callbacks
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];
      this.publish(bi.id, "preStep");
    }

    // Leap frog
    // vnew = v + h*f/m
    // xnew = x + h*vnew
    if (doProfiling) {
      profilingStart = this.now();
    }
    const stepnumber = this.stepnumber;
    const quatNormalize = stepnumber % (this.quatNormalizeSkip + 1) === 0;
    const quatNormalizeFast = this.quatNormalizeFast;

    for (i = 0; i !== N; i++) {
      bodies[i].integrate(dt, quatNormalize, quatNormalizeFast);
    }
    this.clearForces();

    this.broadphase.dirty = true;

    if (doProfiling) {
      profile.integrate = this.now() - profilingStart;
    }

    // Update step number
    this.stepnumber += 1;

    this.publish("cannon", "postStep");

    // Invoke post-step callbacks
    for (i = 0; i !== N; i++) {
      const bi = bodies[i];
      const postStep = bi.postStep;
      if (postStep) {
        postStep.call(bi);
      }
    }

    // Sleeping update
    let hasActiveBodies = true;
    if (this.allowSleep) {
      hasActiveBodies = false;
      for (i = 0; i !== N; i++) {
        const bi = bodies[i];
        bi.sleepTick(this.time);

        if (bi.sleepState !== Body.SLEEPING) {
          hasActiveBodies = true;
        }
      }
    }
    this.hasActiveBodies = hasActiveBodies;
  }

  /**
   * Sets all body forces in the world to zero.
   * @method clearForces
   */
  clearForces() {
    const bodies = this.bodies;
    const N = bodies.length;
    for (let i = 0; i !== N; i++) {
      const b = bodies[i];
      const force = b.force;
      const tau = b.torque;
      b.force.set(0, 0, 0);
      b.torque.set(0, 0, 0);
    }
  }

  publishContactEvents() {
    const { additions, removals } = this;

    this.bodyOverlapKeeper.getDiff(additions, removals);

    for (let i = 0, l = additions.length; i < l; i += 2) {
      this.publish("cannon", "begin-contact", {
        bodyA: this.getBodyById(additions[i]),
        bodyB: this.getBodyById(additions[i + 1])
      });
    }

    for (let i = 0, l = removals.length; i < l; i += 2) {
      const bodyA = this.getBodyById(removals[i]);
      const bodyB = this.getBodyById(removals[i + 1]);
      this.publish("cannon", "end-contact", { bodyA, bodyB });
    }

    additions.length = removals.length = 0;

    this.shapeOverlapKeeper.getDiff(additions, removals);

    for (let i = 0, l = additions.length; i < l; i += 2) {
      const shapeA = this.getShapeById(additions[i]);
      const shapeB = this.getShapeById(additions[i + 1]);
      const bodyA = shapeA.body;
      const bodyB = shapeB.body;
      this.publish("cannon", "begin-shape-contact", {
        shapeA,
        shapeB,
        bodyA,
        bodyB
      });
    }

    for (let i = 0, l = removals.length; i < l; i += 2) {
      const shapeA = this.getShapeById(removals[i]);
      const shapeB = this.getShapeById(removals[i + 1]);
      if (shapeA && shapeB) {
        const bodyA = shapeA.body;
        const bodyB = shapeB.body;
        this.publish("cannon", "end-shape-contact", {
          shapeA,
          shapeB,
          bodyA,
          bodyB
        });
      }
    }
  }

  destroy() {
    super.destroy();

    this.contacts.forEach(contact => contact.destroy());
    this.frictionEquations.forEach(frictionEquation =>
      frictionEquation.destroy()
    );
    this.broadphase.destroy();
    this.bodies.forEach(body => body.destroy());
    this.solver.destroy();
    this.constraints.forEach(constraint => constraint.destroy());
    this.narrowphase.destroy();
    this.materials.forEach(material => material.destroy());
    this.contactMaterials.forEach(contactMaterial => contactMaterial.destroy());

    this.gravity.destroy();

    this.collisionMatrix.destroy();
    this.collisionMatrixPrevious.destroy();
    this.bodyOverlapKeeper.destroy();
    this.shapeOverlapKeeper.destroy();
    this.contactMaterialTable.destroy();

    this.defaultMaterial.destroy();
    this.defaultContactMaterial.destroy();

    this.tmpRay.destroy();

    this.World_step_oldContacts.forEach(contactEquation =>
      contactEquation.destroy()
    );
    this.World_step_frictionEquationPool.forEach(frictionEquation =>
      frictionEquation.destroy()
    );

    this.World_step_p1.forEach(body => body.destroy);
    this.World_step_p2.forEach(body => body.destroy);
  }
}
World.register("CANNON.World");

export { World };
