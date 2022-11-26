/* global Croquet, AFRAME, Q */

import HandTrackingControlsView from "./HandTrackingControlsView.js";

class UserView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log(`Creating User View with userViewId "${this.userViewId}"`);

    // grabing the <a-scene /> so we can add/remove our user <a-entity />
    this.scene = AFRAME.scenes[0];
    this.cameraEntity = this.scene.querySelector("a-camera");

    this.eventListeners = [];

    // check if this user represents you or a remote user. If it's you there's no need to create a User entity, and we'll focus on publishing our camera matrix to our User Model
    this.log("Checking if this UserView represents you or a remote user");
    if (this.isMyUser) {
      this.log(
        "This UserView represents you. Adding a throttled function to publish our camera matrix to the UserModel"
      );
      this.publishData = AFRAME.utils.throttle(
        () => {
          // instead of just publishing the camera matrix, we check if the camera matrix has changed since we last updated the model matrix
          // in the model we also decompose the matrix to position/quaternion/scale, so rather than compare matrix elements we could check position difference and quaternion angle for more fine-tuned conditions

          // only publish camera matrix if it moved
          const message = this.createPublishMessage();
          if (message) {
            this.publish(this.viewId, "set-data", message);
          }
        },
        1000 / 24,
        this
      );
      this.head = document.querySelector("#camera .user .head");
      this.head.setAttribute("color", this.color);
      this.addEventListener(
        this.head,
        "componentchanged",
        this.onHeadComponentChanged
      );
      this.subscribe(this.userViewId, "update-color", this.updateColor);
    } else {
      this.log(
        "This UserView represents a remote user. Creating a User Entity"
      );
      // cloning the user template in our scene to create a user entity
      this.entity = document
        .getElementById("userTemplate")
        .content.cloneNode(true)
        .querySelector(".user");
      this.head = this.entity.querySelector(".head");
      this.head.setAttribute("color", this.color);
      this.subscribe(this.userViewId, "update-color", this.updateColor);
      this.lastTimeMatrixWasUpdated = 0;
      this.log("Remote User Entity Created", this.entity);
      this.addEventListener(
        this.head,
        "componentchanged",
        this.onHeadComponentChanged
      );
      this.entity.addEventListener(
        "loaded",
        (event) => {
          this.log("Remote User Entity loaded", this.entity);
          // We want to manually update the matrix in our "update" method
          this.entity.object3D.matrixAutoUpdate = false;
        },
        { once: true }
      );
      this.log("Adding remote user entity to the scene");
      this.scene.appendChild(this.entity);
    }

    this.handTrackingControlsViews = {};
    if (!this.isMyUser) {
      this.handTrackingControlsEntity = document.createElement("a-entity");
      this.handTrackingControlsEntity.addEventListener("loaded", (event) => {
        this.handTrackingControlsEntity.object3D.matrixAutoUpdate = false;
      });
    }
    for (const side in this.model.handTrackingControlsModels) {
      this.handTrackingControlsViews[side] = new HandTrackingControlsView(
        this.model.handTrackingControlsModels[side]
      );
      this.handTrackingControlsEntity?.appendChild(
        this.handTrackingControlsViews[side].entity
      );
    }
    if (this.handTrackingControlsEntity) {
      this.scene.appendChild(this.handTrackingControlsEntity);
    }
  }

  createPublishMessage() {
    const message = {};
    let shouldPublish = false;

    const matrix = this.createMatrixMessage();
    if (matrix) {
      message.matrix = matrix;
      message.offsetMatrix = this.cameraEntity.parentEl.object3D.matrixWorld;
      shouldPublish = true;
    }

    for (const side in this.handTrackingControlsViews) {
      const _message =
        this.handTrackingControlsViews[side].createPublishMessage();
      if (_message) {
        message.handTrackingControls = message.handTrackingControls || {};
        message.handTrackingControls[side] = _message;
        shouldPublish = true;
      }
    }

    if (shouldPublish) {
      return message;
    }
  }
  createMatrixMessage() {
    const hasCameraMovedSinceLastModelMatrixUpdate =
      this.camera.matrixWorld.elements.every(
        (value, index) => value === this.model.matrix.elements[index]
      );
    if (!hasCameraMovedSinceLastModelMatrixUpdate) {
      //this.log("Camera movement detected");
      return this.camera.matrixWorld;
    }
  }

  log(string, ...etc) {
    if (!Q.LOGGING.UserView) return;

    console.groupCollapsed(
      `[UserView-${this.userViewId}${this.isMyUser ? " (YOU)" : ""}] ${string}`,
      ...etc
    );
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  onHeadComponentChanged(event) {
    const componentName = event.detail.name;
    this.log(`"${componentName}" changed for head`);
    switch (componentName) {
      case "material":
        const { color } = this.head.components.material.data;
        this.setColor(color);
        break;
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

  setColor(color) {
    if (this.isAColor(color) && color !== this.model.color) {
      this.log(`Setting color of user "${this.userViewId}"`);
      this.publish(this.userViewId, "set-color", color);
    }
  }

  isAColor(color) {
    if (!this._styleUsedForTestingColor) {
      this._styleUsedForTestingColor = new Option().style;
    }
    const style = this._styleUsedForTestingColor;
    style.color = "";
    style.color = color;
    return style.color.length > 0;
  }

  updateColor() {
    this.log(`Changing color to ${this.color}`);
    this.head.setAttribute("color", this.color);
  }

  // SCENE GETTERS
  get camera() {
    return this.scene.camera;
  }

  // MODEL GETTERS
  get userViewId() {
    return this.model.userViewId;
  }
  get color() {
    return this.model.color;
  }
  get matrix() {
    return this.model.matrix;
  }
  get offsetMatrix() {
    return this.model.offsetMatrix;
  }
  get lastTimeMatrixWasSet() {
    return this.model.lastTimeMatrixWasSet;
  }

  // useful to determine whether to create an entity or not
  get isMyUser() {
    return this.userViewId === this.viewId;
  }

  update() {
    if (this.isMyUser) {
      //this.publishCameraMatrix();
      this.publishData();
    } else {
      // check if the remote user has moved since last time we updated their matrix
      if (
        this.entity &&
        this.entity.hasLoaded &&
        this.lastTimeMatrixWasSet > this.lastTimeMatrixWasUpdated
      ) {
        this.entity.object3D.matrix.copy(this.matrix);
        this.entity.object3D.matrixWorldNeedsUpdate = true;
        this.lastTimeMatrixWasUpdated = this.lastTimeMatrixWasSet;
        this.handTrackingControlsEntity?.object3D.matrix.copy(
          this.offsetMatrix
        );
        if (this.handTrackingControlsEntity) {
          this.handTrackingControlsEntity.object3D.matrixWorldNeedsUpdate = true;
        }
      }
    }
    for (const side in this.handTrackingControlsViews) {
      this.handTrackingControlsViews[side].update();
    }
  }

  detach() {
    super.detach();

    this.log(`detaching user`);

    this.removeAllEventListeners();

    for (const side in this.handTrackingControlsViews) {
      this.handTrackingControlsViews[side].detach();
    }

    // we only create user <a-entity> for other users, so we can't remove an entity if there isn't one
    if (!this.isMyUser && this.entity) {
      this.log(`removing user entity from our scene`);
      this.entity.remove();
      this.handTrackingControlsEntity?.remove();
    }
  }
}

export default UserView;
