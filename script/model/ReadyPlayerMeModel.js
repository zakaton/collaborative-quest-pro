/* global Croquet, THREE, Q */

class ReadyPlayerMeModel extends Croquet.Model {
  init() {
    super.init();

    this.userViewId = userViewId;

    this.log(`Creating ReadyPlayerMeModel`);
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
}
ReadyPlayerMeModel.register("ReadyPlayerMe");

export default ReadyPlayerMeModel;
