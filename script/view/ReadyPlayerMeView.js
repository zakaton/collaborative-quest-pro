/* global Croquet, AFRAME, Q */

class ReadyPlayerMeView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log(`Creating ReadyPlayerMeView`);

    // grabing the rig entity
    this.scene = AFRAME.scenes[0];
    this.entity = this.scene.querySelector("#rig");

    this.entity.addEventListener("connectudp", this.onConnect.bind(this));
    this.subscribe(this.model.id, "user-update", this.onUserUpdate);

    this.eventListeners = [];

    this.entityWorldMatrix = new THREE.Matrix4();

    this.publishData = AFRAME.utils.throttle(
      () => {
        const message = this.createPublishMessage();
        if (message) {
          this.publish(this.model.id, "set-data", message);
        }
      },
      1000 / 24,
      this
    );
    this.lastTimeDataWasUpdated = 0;
    if (this.userViewId) {
      this.onUserUpdate();
    }
  }

  // Helper for adding/removing eventlisteners to entities that automatically get removed when detaching from the session
  addEventListener(target, type, listener, options) {
    this.log(`Adding "${type}" eventlistener`, target);

    const boundListener = listener.bind(this);
    target.addEventListener(type, boundListener, options);
    this.eventListeners.push({ target, type, listener, boundListener });
  }
  removeEventListener(_target, _type, _listener) {
    const eventListenerObject = this.eventListeners.find(
      ({ target, type, listener }) => {
        return target === target && type === _type && listener === _listener;
      }
    );
    if (eventListenerObject) {
      const { target, type, boundListener } = eventListenerObject;
      this.log(`Removing "${type}" eventlistener`, target);
      target.removeEventListener(type, boundListener);

      const index = this.eventListeners.indexOf(eventListenerObject);
      this.eventListeners.splice(index, 1);
    }
  }
  // Removing all eventlisteners created so when we rejoin the session we won't trigger eventlisteners added in the previous session
  removeAllEventListeners() {
    this.eventListeners.forEach(({ target, type, boundListener }) => {
      this.log(`Removing "${type}" eventlistener`, target);
      target.removeEventListener(type, boundListener);
    });
    this.eventListeners.length = 0;
  }

  log(string, ...etc) {
    if (!Q.LOGGING.ReadyPlayerMeView) return;

    console.groupCollapsed(`[ReadyPlayerMeView] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  onConnect() {
    this.setUser();
  }
  setUser() {
    this.publish(this.model.id, "set-user", this.viewId);
  }
  onUserUpdate() {
    this.log("user-update", this.isMyUser);
    if (this.isMyUser) {
      const user = document.querySelector("#camera .user");
      if (user) {
        user.setAttribute("visible", false);
      }
    } else {
      document
        .querySelectorAll(
          `[hand-tracking-controls-proxy][data-user-view-id="${this.userViewId}"]`
        )
        .forEach((handTrackingControls) => {
          handTrackingControls.dataset.disable = true;
          handTrackingControls.setAttribute("visible", false);
        });
      const user = document.querySelector(
        `.user[data-user-view-id="${this.userViewId}"]`
      );
      if (user) {
        user.dataset.disabled = true;
        user.setAttribute("visible", false);
      }
    }
  }

  get userViewId() {
    return this.model.userViewId;
  }
  get isMyUser() {
    return this.userViewId == this.viewId;
  }
  get lastTimeDataWasSet() {
    return this.model.lastTimeDataWasSet;
  }
  get matrices() {
    return this.model.matrices;
  }
  get quaternions() {
    return this.model.quaternions;
  }
  get component() {
    return this.entity.components?.["ready-player-me"];
  }

  areArraysEqual(array1, array2) {
    return (
      array1 &&
      array2 &&
      array1?.length == array2?.length &&
      array1.every((element1, index) => element1 == array2[index])
    );
  }
  areMatricesEqual(matrix1, matrix2) {
    return this.areArraysEqual(matrix1?.elements, matrix2?.elements);
  }
  areQuaternionsEqual(quaternion1, quaternion2) {
    return this.areArraysEqual(quaternion1?.toArray(), quaternion2?.toArray());
  }
  createPublishMessage() {
    const message = { matrices: {}, quaternions: {} };
    let shouldPublish = false;
    const component = this.component;
    if (component) {
      this.entityWorldMatrix.copy(component.el.object3D.matrix);
      if (
        !this.areMatricesEqual(this.entityWorldMatrix, this.matrices.camera)
      ) {
        message.matrices.entity = this.entityWorldMatrix;
        shouldPublish = true;
        // this.log("Camera movement detected");
      }
      for (const boneName in component.allBones) {
        const { quaternion } = component.allBones[boneName];
        if (!this.areQuaternionsEqual(quaternion, this.quaternions[boneName])) {
          message.quaternions[boneName] = quaternion.clone();
          shouldPublish = true;
        }
      }
    }
    if (shouldPublish) {
      return message;
    }
  }
  update() {
    if (this.isMyUser) {
      this.publishData();
    } else {
      if (
        this.entity &&
        this.entity.hasLoaded &&
        this.lastTimeDataWasSet > this.lastTimeDataWasUpdated &&
        this.component
      ) {
        this.lastTimeDataWasUpdated = this.lastTimeDataWasSet;
        for (const matrixName in this.matrices) {
          const matrix = this.matrices[matrixName];
          switch (matrixName) {
            case "entity":
              this.entity.object3D.position.setFromMatrixPosition(matrix);
              this.entity.object3D.rotation.setFromRotationMatrix(matrix);
              this.entity.object3D.updateWorldMatrix();
              break;
            default:
              break;
          }
        }
        const component = this.component;
        for (const quaternionName in this.quaternions) {
          const quaternion = this.quaternions[quaternionName];
          const bone = component.allBones[quaternionName];
          if (bone) {
            bone.quaternion.copy(quaternion);
            bone.updateMatrix();
          }
        }
      }
    }
  }

  detach() {
    super.detach();
    this.log(`detaching`);
    this.removeAllEventListeners();
  }
}

export default ReadyPlayerMeView;
