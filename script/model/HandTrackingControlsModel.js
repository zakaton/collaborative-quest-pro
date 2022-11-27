/* global Croquet, THREE, CANNON, Q */

class HandTrackingControlsModel extends Croquet.Model {
  init({ userViewId, color, side }) {
    super.init();

    this.userViewId = userViewId;
    this.side = side;
    this.publishPrefix = `${this.userViewId}-${this.side}-handTrackingControls`;

    this.log(
      `Creating Hand Tracking Controls Model for userViewId "${userViewId}"`
    );

    this.color = color;
    this.isVisible = false;

    this.boneNames = this.BONE_SUFFIXES.map(
      (boneSuffix) => this.bonePrefix + boneSuffix
    );
    this.boneMatrices = {};
    this.boneNames.forEach((boneName) => {
      this.boneMatrices[boneName] = new THREE.Matrix4();
    });

    this.subscribe(this.publishPrefix, "set-bones", this.setBones);

    this.lastTimeBonesWereSet = 0;
  }

  static BONE_PREFIX = {
    left: "b_l_",
    right: "b_r_",
  };
  get bonePrefix() {
    return this.constructor.BONE_PREFIX[this.side];
  }

  static BONE_SUFFIXES = [
    "wrist",
    "thumb1",
    "thumb2",
    "thumb3",
    "thumb_null",
    "index0",
    "index1",
    "index2",
    "index3",
    "index_null",
    "middle0",
    "middle1",
    "middle2",
    "middle3",
    "middle_null",
    "ring0",
    "ring1",
    "ring2",
    "ring3",
    "ring_null",
    "pinky0",
    "pinky1",
    "pinky2",
    "pinky3",
    "pinky_null",
  ];
  get BONE_SUFFIXES() {
    return this.constructor.BONE_SUFFIXES;
  }

  log(string, ...etc) {
    if (!Q.LOGGING.HandTrackingControlsModel) return;

    console.groupCollapsed(
      `[HandTrackingControlsModel-${this.userViewId}] ${string}`,
      ...etc
    );
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  static types() {
    return {
      "THREE.Vector3": THREE.Vector3,
      "THREE.Quaternion": THREE.Quaternion,
      "THREE.Matrix4": THREE.Matrix4,
    };
  }

  setColor(color) {
    this.log(`Changing color to ${color}`);
    this.color = color;
    this.publish(this.publishPrefix, "update-color");
  }

  setBones({ isVisible, boneMatrices }) {
    this.isVisible = isVisible;

    if (boneMatrices) {
      for (const boneName in boneMatrices) {
        this.boneMatrices[boneName].copy(boneMatrices[boneName]);
      }
    }

    this.lastTimeBonesWereSet = this.now();
  }

  destroy() {
    this.log("Destroying self");
    super.destroy();
  }
}
HandTrackingControlsModel.register("HandTrackingControls");

export default HandTrackingControlsModel;
