/* global Croquet, AFRAME, THREE, Q */

class HandTrackingControlsView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.lastTimeBonesWereUpdated = 0;

    this.eventListeners = [];

    this.log(
      `Creating HandTrackingControlsView for userViewId "${this.userViewId}"`
    );

    // grabing the <a-scene /> so we can add/remove our user <a-entity />
    this.scene = AFRAME.scenes[0];
    this.cameraEntity = this.scene.querySelector("a-camera");

    // check if these hands represent you or a remote user. If it's you there's no need to create hand entities, and we'll focus on publishing our matrix/joints to our HandTrackingControls Model
    this.log("Checking if these hands represent you or a remote user");
    if (this.isMyHand) {
      this.entity = this.scene.querySelector(
        `[hand-tracking-controls*="${this.side}"]`
      );
      this.entity.setAttribute("hand-tracking-controls", {
        modelColor: this.color,
      });
      this.component = this.entity.components["hand-tracking-controls"];
      this.updateColor();
      this.log(
        "These Hands represents you. Adding a throttled function to publish our matrix/joints to the HandTrackingControlsModel"
      );

      this.localBoneMatrices = {};
      for (const boneName in this.model.boneMatrices) {
        this.localBoneMatrices[boneName] = new THREE.Matrix4();
      }

      this.publishBones = AFRAME.utils.throttle(
        () => {
          // instead of just publishing the bone matrices, we also check if the hands are visible
          const message = this.createPublishMessage();
          if (message) {
            this.publish(this.publishPrefix, "set-bones", message);
          }
        },
        1000 / 24,
        this
      );
    } else {
      this.log(
        "These Hands represents a remote user. Creating a HandTrackingControls proxy Entity"
      );
      // creating hands
      this.entity = document.createElement("a-entity");
      //this.entity.setAttribute("visible", this.isVisible);
      this.entity.setAttribute(
        "hand-tracking-controls-proxy",
        `modelColor: ${this.color}; hand: ${this.model.side}`
      );
      this.entity.addEventListener("mesh-loaded", (event) => {
        this.component = this.entity.components["hand-tracking-controls-proxy"];
        for (const boneName in this.model.boneMatrices) {
          const bone = this.getBone(boneName);
          bone.matrixAutoUpdate = false;
        }
      });
      this.scene.appendChild(this.entity);
    }

    this.subscribe(this.model.publishPrefix, "update-color", this.updateColor);
  }

  log(string, ...etc) {
    if (!Q.LOGGING.HandTrackingControlsView) return;

    console.groupCollapsed(
      `[HandTrackingControlsView-${this.userViewId}-${this.side}${
        this.isMyHand ? " (YOU)" : ""
      }] ${string}`,
      ...etc
    );
    console.trace(); // hidden in collapsed group
    console.groupEnd();
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

  // useful to determine whether to create an entity or not
  get isMyHand() {
    return this.userViewId === this.viewId;
  }
  get userViewId() {
    return this.model.userViewId;
  }
  get color() {
    return this.model.color;
  }
  get side() {
    return this.model.side;
  }
  get isVisible() {
    return this.model.isVisible;
  }
  get hasMesh() {
    return Boolean(this.component?.mesh);
  }
  get isMeshVisible() {
    return Boolean(this.hasMesh && this.component.mesh.visible);
  }
  updateMeshVisibility() {
    if (this.hasMesh && this.isVisible != this.isMeshVisible) {
      //this.log("updating visibility", this.isVisible)
      this.component.mesh.visible = this.isVisible;
    }
  }
  get publishPrefix() {
    return this.model.publishPrefix;
  }
  get lastTimeBonesWereSet() {
    return this.model.lastTimeBonesWereSet;
  }
  get bones() {
    return this.component?.bones;
  }
  getBone(boneName) {
    return this.component.getBone(boneName);
  }

  createPublishMessage() {
    let message;
    const didVisibilityChange = this.isVisible != this.isMeshVisible;
    const shouldTriggerUpdate = this.isMeshVisible || didVisibilityChange;
    if (shouldTriggerUpdate) {
      message = { isVisible: this.isMeshVisible };
      if (message.isVisible) {
        this.updateLocalBoneMatrices();
        message.boneMatrices = this.localBoneMatrices;
      }
    }
    return message;
  }

  updateLocalBoneMatrices() {
    for (const boneName in this.localBoneMatrices) {
      const matrix = this.localBoneMatrices[boneName];
      const bone = this.getBone(boneName);
      matrix.copy(bone.matrix);
    }
  }
  updateBoneMatrices() {
    if (this.bones) {
      for (const boneName in this.model.boneMatrices) {
        const matrix = this.model.boneMatrices[boneName];
        const bone = this.getBone(boneName);
        bone.matrix.copy(matrix);
        bone.matrixWorldNeedsUpdate = true;
      }
    }
  }

  updateColor() {
    if (this.hasMesh) {
      this.component.skinnedMesh.material.color = new THREE.Color(this.color);
    }
  }

  update() {
    if (this.isMyHand) {
      if (this.hasMesh) {
        //this.publishBones();
      }
    } else {
      // check if the remote user has moved since last time we updated their matrix
      if (
        this.entity &&
        this.entity.hasLoaded &&
        this.lastTimeBonesWereSet > this.lastTimeBonesWereUpdated
      ) {
        this.updateMeshVisibility();
        this.updateBoneMatrices();
        this.lastTimeBonesWereUpdated = this.lastTimeBonesWereSet;
      }
    }
  }

  detach() {
    super.detach();

    this.log(`detaching hands`);

    this.removeAllEventListeners();

    // we only create user <a-entity> for other users, so we can't remove an entity if there isn't one
    if (!this.isMyHand && this.entity) {
      this.log(`removing hands from our scene`);
      this.entity.remove();
    }
  }
}

export default HandTrackingControlsView;
