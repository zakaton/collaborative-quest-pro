import { Vec3 } from "../math/Vec3.js";
import { Body } from "../objects/Body.js";
import { Sphere } from "../shapes/Sphere.js";
import { Box } from "../shapes/Box.js";
import { HingeConstraint } from "../constraints/HingeConstraint.js";

/* global Croquet, ISLAND */

class RigidVehicle extends Croquet.Model {
  init(options = {}) {
    super.init();

    this.wheelBodies = [];
    this.coordinateSystem =
      typeof options.coordinateSystem !== "undefined"
        ? options.coordinateSystem.clone()
        : new Vec3(1, 2, 3);

    if (options.chassisBody) {
      this.chassisBody = options.chassisBody;
    } else {
      // No chassis body given. Create it!
      this.chassisBody = Body.create({
        mass: 1,
        shape: Box.create({
          halfExtents: new Vec3(5, 0.5, 2)
        })
      });
    }

    this.constraints = [];
    this.wheelAxes = [];
    this.wheelForces = [];
  }

  static get torque() {
    const name = "CANNON.RigidVehicle.torque";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get worldAxis() {
    const name = "CANNON.RigidVehicle.worldAxis";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  /**
   * Add a wheel
   * @method addWheel
   * @param {object} options
   * @param {boolean} [options.isFrontWheel]
   * @param {Vec3} [options.position] Position of the wheel, locally in the chassis body.
   * @param {Vec3} [options.direction] Slide direction of the wheel along the suspension.
   * @param {Vec3} [options.axis] Axis of rotation of the wheel, locally defined in the chassis.
   * @param {Body} [options.body] The wheel body.
   */
  addWheel(options = {}) {
    let wheelBody;

    if (options.body) {
      wheelBody = options.body;
    } else {
      // No wheel body given. Create it!
      wheelBody = Body.create({
        mass: 1,
        shape: Sphere.create({ radius: 1.2 })
      });
    }

    this.wheelBodies.push(wheelBody);
    this.wheelForces.push(0);

    // Position constrain wheels
    const zero = new Vec3();
    const position =
      typeof options.position !== "undefined"
        ? options.position.clone()
        : new Vec3();

    // Set position locally to the chassis
    const worldPosition = new Vec3();
    this.chassisBody.pointToWorldFrame(position, worldPosition);
    wheelBody.position.set(worldPosition.x, worldPosition.y, worldPosition.z);

    // Constrain wheel
    const axis =
      typeof options.axis !== "undefined"
        ? options.axis.clone()
        : new Vec3(0, 0, 1);
    this.wheelAxes.push(axis);

    const hingeConstraint = HingeConstraint.create({
      bodyA: this.chassisBody,
      bodyB: wheelBody,
      hingeConstraintOptions: {
        pivotA: position,
        axisA: axis,
        pivotB: Vec3.ZERO,
        axisB: axis,
        collideConnected: false
      }
    });

    this.constraints.push(hingeConstraint);

    return this.wheelBodies.length - 1;
  }

  /**
   * Set the steering value of a wheel.
   * @method setSteeringValue
   * @param {number} value
   * @param {integer} wheelIndex
   * @todo check coordinateSystem
   */
  setSteeringValue(value, wheelIndex) {
    // Set angle of the hinge axis
    const axis = this.wheelAxes[wheelIndex];

    const c = Math.cos(value);
    const s = Math.sin(value);
    const x = axis.x;
    const z = axis.z;
    this.constraints[wheelIndex].axisA.set(-c * x + s * z, 0, s * x + c * z);
  }

  /**
   * Set the target rotational speed of the hinge constraint.
   * @method setMotorSpeed
   * @param {number} value
   * @param {integer} wheelIndex
   */
  setMotorSpeed(value, wheelIndex) {
    const hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.enableMotor();
    hingeConstraint.motorTargetVelocity = value;
  }

  /**
   * Set the target rotational speed of the hinge constraint.
   * @method disableMotor
   * @param {number} value
   * @param {integer} wheelIndex
   */
  disableMotor(wheelIndex) {
    const hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.disableMotor();
  }

  /**
   * Set the wheel force to apply on one of the wheels each time step
   * @method setWheelForce
   * @param  {number} value
   * @param  {integer} wheelIndex
   */
  setWheelForce(value, wheelIndex) {
    this.wheelForces[wheelIndex] = value;
  }

  /**
   * Apply a torque on one of the wheels.
   * @method applyWheelForce
   * @param  {number} value
   * @param  {integer} wheelIndex
   */
  applyWheelForce(value, wheelIndex) {
    const axis = this.wheelAxes[wheelIndex];
    const wheelBody = this.wheelBodies[wheelIndex];
    const bodyTorque = wheelBody.torque;

    axis.scale(value, RigidVehicle.torque);
    wheelBody.vectorToWorldFrame(RigidVehicle.torque, RigidVehicle.torque);
    bodyTorque.vadd(RigidVehicle.torque, bodyTorque);
  }

  /**
   * Add the vehicle including its constraints to the world.
   * @method addToWorld
   * @param {World} world
   */
  addToWorld(world) {
    const constraints = this.constraints;
    const bodies = this.wheelBodies.concat([this.chassisBody]);

    for (let i = 0; i < bodies.length; i++) {
      world.addBody(bodies[i]);
    }

    for (let i = 0; i < constraints.length; i++) {
      world.addConstraint(constraints[i]);
    }

    world.addEventListener("preStep", this._update.bind(this));
  }

  _update() {
    const wheelForces = this.wheelForces;
    for (let i = 0; i < wheelForces.length; i++) {
      this.applyWheelForce(wheelForces[i], i);
    }
  }

  /**
   * Remove the vehicle including its constraints from the world.
   * @method removeFromWorld
   * @param {World} world
   */
  removeFromWorld(world) {
    const constraints = this.constraints;
    const bodies = this.wheelBodies.concat([this.chassisBody]);

    for (let i = 0; i < bodies.length; i++) {
      world.removeBody(bodies[i]);
    }

    for (let i = 0; i < constraints.length; i++) {
      world.removeConstraint(constraints[i]);
    }
  }

  /**
   * Get current rotational velocity of a wheel
   * @method getWheelSpeed
   * @param {integer} wheelIndex
   */
  getWheelSpeed(wheelIndex) {
    const axis = this.wheelAxes[wheelIndex];
    const wheelBody = this.wheelBodies[wheelIndex];
    const w = wheelBody.angularVelocity;
    this.chassisBody.vectorToWorldFrame(axis, RigidVehicle.worldAxis);
    return w.dot(RigidVehicle.worldAxis);
  }
}
RigidVehicle.register("CANNON.RigidVehicle");

export { RigidVehicle };
