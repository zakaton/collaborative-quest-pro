/* global Croquet, THREE, Q */

import * as CANNON from "../cannon/CANNON.js";
window.CANNON = CANNON
class PhysicsModel extends Croquet.Model {
  init() {
    super.init();

    this.log("Creating Physics");

    // https://croquet.studio/sdk/docs/Model.html#beWellKnownAs
    this.beWellKnownAs("Physics");

    // https://croquet.studio/sdk/docs/Model.html#wellKnownModel
    this.modelRoot = this.wellKnownModel("modelRoot");

    this.log("Creating World");
    this.world = CANNON.World.create();
    this.world.bodiesIndexedByName = {};

    this.world.gravity.set(0, Q.GRAVITY, 0);

    this.was = this.now();

    //this.future(Q.STEP_MS).step();

    this.log("Finished Physics Constructor");
  }

  log(string, ...etc) {
    if (!Q.LOGGING.PhysicsModel) return;

    console.groupCollapsed(`[Physics] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  // while this.world stories this.world.bodies in an array, we'd also like a {name: body} mapping to make it easier to get bodies by name in EntityModel.js
  // that way we don't have to use this.world.bodies.find every time we want to retrieve an Entity's body
  // we could also assign the body to an EntityModel directly (entityModel.physicsBody), but then we'd have to create a custom static types(){} method for the CANNON.Body class, which would be annoying
  getPhysicsBodyByName(name) {
    // in cannon.serialzer.js we added a world.bodiesIndexedByName {name: body} object that stores the bodies in a way that's faster to retrieve bodies by name
    return this.world.bodiesIndexedByName[name];
  }

  getEntityModelByName(entityName) {
    return this.modelRoot.getEntityModelByName(entityName);
  }

  addBody(physicsBody) {
    if (
      physicsBody &&
      !this.world.bodies.includes(physicsBody) &&
      !(physicsBody.name in this.world.bodiesIndexedByName)
    ) {
      this.log("Adding Physics body", physicsBody);
      this.world.addBody(physicsBody);
      this.world.bodiesIndexedByName[physicsBody.name] = physicsBody;
    }
  }
  removeBody(physicsBody) {
    if (
      physicsBody &&
      this.world.bodies.includes(physicsBody) &&
      physicsBody.name in this.world.bodiesIndexedByName
    ) {
      this.log("Removing body", physicsBody);
      this.world.removeBody(physicsBody);
      delete this.world.bodiesIndexedByName[physicsBody.name];
    }
  }

  step() {
    const now = this.now();
    const delta = now - this.was;
    this.was = now;

    // http://schteppe.github.io/cannon.js/docs/classes/World.html#method_step
    this.world.step(delta / 1000.0);

    this.world.bodies.forEach(physicsBody => {
      const entityModel = this.getEntityModelByName(physicsBody.name);
      if (entityModel) {
        entityModel.onPhysicsBodyUpdate();
      }
    });

    this.future(Q.STEP_MS).step();
  }
  
  destroy() {
    super.destroy();
    this.world.destroy();
  }
}
PhysicsModel.register("Physics");

export default PhysicsModel;
