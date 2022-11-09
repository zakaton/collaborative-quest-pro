/* global Croquet, THREE, CANNON, Q */

import * as CANNON from "../cannon/CANNON.js";
import HandTrackingControlsModel from "./HandTrackingControlsModel.js";

class UserModel extends Croquet.Model {
  init({ userViewId }) {
    super.init();

    this.userViewId = userViewId;

    this.log(`Creating User Model with userViewId "${userViewId}"`);

    this.color = "#";
    // generating a random string of 6 hex values for our color (RRGGBB)
    for (let colorIndex = 0; colorIndex < 6; colorIndex++) {
      this.color += Math.floor(this.random() * 16).toString(16);
    }
    this.log(`Created a random color ${this.color} for our user`);
    this.subscribe(this.userViewId, "set-color", this.setColor);

    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3();
    this.matrix.decompose(this.position, this.quaternion, this.scale);
    this.subscribe(this.userViewId, "set-matrix", this.setMatrix);
    this.subscribe(this.userViewId, "set-data", this.setData);

    this.lastTimeMatrixWasSet = this.now();

    // https://croquet.studio/sdk/docs/Model.html#wellKnownModel
    this.physics = this.wellKnownModel("Physics");
    //this.createPhysicsBody();

    this.handTrackingControlsModels = {
      left: HandTrackingControlsModel.create({
        userViewId: this.userViewId,
        color: this.color,
        side: "left",
      }),
      right: HandTrackingControlsModel.create({
        userViewId: this.userViewId,
        color: this.color,
        side: "right",
      }),
    };
  }

  log(string, ...etc) {
    if (!Q.LOGGING.UserModel) return;

    console.groupCollapsed(`[UserModel-${this.userViewId}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  static types() {
    return {
      "THREE.Matrix4": THREE.Matrix4,
      "THREE.Vector3": THREE.Vector3,
      "THREE.Quaternion": THREE.Quaternion,
    };
  }

  setColor(color) {
    this.log(`Changing color to ${color}`);
    this.color = color;
    for (const side in this.handTrackingControlsModels) {
      this.handTrackingControlsModels[side].setColor(color);
    }
    this.publish(this.userViewId, "update-color");
  }

  setMatrix(matrix) {
    this.matrix.copy(matrix);
    this.matrix.decompose(this.position, this.quaternion, this.scale);
    this.lastTimeMatrixWasSet = this.now();
    this.updatePhysicsBody();
  }

  setData({ matrix, handTrackingControls }) {
    if (matrix) {
      this.setMatrix(matrix);
    }
    if (handTrackingControls) {
      for (const side in handTrackingControls) {
        this.handTrackingControlsModels[side].setBones(
          handTrackingControls[side]
        );
      }
    }
  }

  createPhysicsBody() {
    this.log("Creating Physics Body");
    if (!this.physicsBody) {
      const shape = CANNON.Box.create({
        halfExtents: new CANNON.Vec3(0.5, 0.5, 0.5),
      });
      this.physicsBody = CANNON.Body.create({
        shape,
        mass: 0,
        position: this.position,
        quaternion: this.quaternion,
      });
      this.physicsBody.name = this.userViewId;
      this.log("Created physics body", this.physicsBody);
      this.physics.addBody(this.physicsBody);
    }
  }
  updatePhysicsBody() {
    if (this.physicsBody) {
      this.physicsBody.position.copy(this.position);
      this.physicsBody.quaternion.copy(this.quaternion);
    }
  }
  removePhysicsBody() {
    if (this.physicsBody) {
      this.log("Removing Physics Body");
      this.physics.removeBody(this.physicsBody);
    }
  }

  destroyPhysicsBody() {
    if (this.physicsBody) {
      this.physicsBody.destroy();
      delete this.physicsBody;
    }
  }

  destroy() {
    this.log("Destroying self");
    this.removePhysicsBody();
    this.destroyPhysicsBody();
    for (const side in this.handTrackingControlsModels) {
      this.handTrackingControlsModels[side].destroy();
    }
    super.destroy();
  }
}
UserModel.register("User");

export default UserModel;
