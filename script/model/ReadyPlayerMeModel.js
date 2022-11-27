/* global Croquet, THREE, Q */

class ReadyPlayerMeModel extends Croquet.Model {
  init() {
    super.init();

    this.log(`Creating ReadyPlayerMeModel`);
    this.lastTimeDataWasSet = 0;
    this.matrices = {};
    this.quaternions = {};
    this.subscribe(this.id, "set-user", this.setUser);
    this.subscribe(this.id, "set-data", this.setData);
  }

  log(string, ...etc) {
    if (!Q.LOGGING.ReadyPlayerMeModel) return;

    console.groupCollapsed(`[ReadyPlayerMeModel-${this.id}] ${string}`, ...etc);
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

  setUser(userViewId) {
    this.userViewId = userViewId;
    this.publish(this.id, "user-update");
  }
  setData({ matrices, quaternions }) {
    for (const matrixName in matrices) {
      this.matrices[matrixName] =
        this.matrices[matrixName] || new THREE.Matrix4();
      this.matrices[matrixName].copy(matrices[matrixName]);
    }
    for (const quaternionName in quaternions) {
      this.quaternions[quaternionName] =
        this.quaternions[quaternionName] || new THREE.Quaternion();
      this.quaternions[quaternionName].copy(quaternions[quaternionName]);
    }
    this.lastTimeDataWasSet = this.now();
  }
}
ReadyPlayerMeModel.register("ReadyPlayerMe");

export default ReadyPlayerMeModel;
