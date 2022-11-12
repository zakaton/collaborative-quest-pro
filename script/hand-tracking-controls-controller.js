/* global AFRAME, THREE */

AFRAME.registerSystem("hand-tracking-controls-controller", {
  schema: {
    targetEntities: { type: "string", default: "[croquet][data-grabbable]" },
    handEntities: { type: "selectorAll", default: "[hand-tracking-controls]" },
    distanceThreshold: { type: "number", default: 0.01 },
  },

  decomposeCameraMatrix() {
    const { quaternion, position, scale } = this.cameraDecomposition;
    this.cameraEntity.object3D.matrixWorld.decompose(
      position,
      quaternion,
      scale
    );
  },

  init: function () {
    window.handTrackingControlsControllerComponent = this;

    this.cameraEntity = this.el.querySelector("a-camera");
    this.cameraDecomposition = {
      quaternion: new THREE.Quaternion(),
      position: new THREE.Vector3(),
      scale: new THREE.Vector3(),
    };

    this.entities = [];
    this.targetEntities = new Set();
    this.grabbedEntities = new Map();
    this.cameraMountedEntities = new Map();

    this.data.handEntities.forEach((handEntity) => {
      if (
        !handEntity
          .getAttributeNames()
          .includes("hand-tracking-controls-controller")
      ) {
        handEntity.setAttribute("hand-tracking-controls-controller", "");
      }
    });

    this.el.querySelectorAll(this.data.targetEntities).forEach((entity) => {
      this.targetEntities.add(entity);
    });

    const callback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === "childList") {
          const { addedNodes, removedNodes } = mutation;
          addedNodes.forEach((node) => {
            if (node.matches(this.data.targetEntities)) {
              this.targetEntities.add(node);
            }
          });
          removedNodes.forEach((node) => {
            if (this.targetEntities.has(node)) {
              this.targetEntities.delete(node);
            }
          });
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(this.el, { childList: true, subtree: true });
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  grabEntity: function (entityToGrab, handTrackingComponent, position) {
    console.log("GRAB", entityToGrab, handTrackingComponent);

    let grabbedEntityConfig;
    if (!this.grabbedEntities.has(entityToGrab)) {
      grabbedEntityConfig = {
        entity: entityToGrab,
        physics: entityToGrab.components.croquet?.data?.physics,
        mass: entityToGrab.components.croquet?.data?.mass,
        hands: [handTrackingComponent],
        shouldUpdatePosition: false,
        shouldUpdateQuaternion: false,
        shouldUpdateScale: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        rotation: new THREE.Euler(0, 0, 0, "YXZ"),
        rotationVector: new THREE.Vector3(),
        scale: entityToGrab.object3D.scale.x,
        scaleVector: new THREE.Vector3(),
        isRelativeToCamera: false,
        component: this,
        camera: this.cameraEntity,
        onPinchMoved(event) {
          const handTrackingComponent =
            event.target.components["hand-tracking-controls-controller"];
          let { position } = event.detail;
          position = handTrackingComponent.offsetPosition(position);
          const isFirstHand = this.hands[0].el == handTrackingComponent.el;

          if (isFirstHand) {
            this.quaternion.multiplyQuaternions(
              this.hands[0].getWristQuaternion(),
              this.entityQuaternionRelativeToWrist
            );

            this.relativeEntityQuaternion
              .copy(this.initialEntityQuaternion)
              .invert()
              .premultiply(this.quaternion);
            this.positionOffset
              .copy(this.entityPositionRelativeToPinch)
              .applyQuaternion(this.relativeEntityQuaternion);

            this.position.addVectors(position, this.positionOffset);

            if (!isNaN(this.position.length())) {
              grabbedEntityConfig.shouldUpdatePosition = true;
            }
            if (!isNaN(this.quaternion.length())) {
              grabbedEntityConfig.shouldUpdateQuaternion = true;
            }
          }

          if (isFirstHand) {
            this.pinchPosition.copy(position);
          } else {
            this.secondHandPinchPosition.copy(position);
          }

          if (this.hands.length > 1) {
            const distanceBetweenPinches = this.pinchPosition.distanceTo(
              this.secondHandPinchPosition
            );
            let newScale =
              distanceBetweenPinches / this.initialDistanceBetweenPinches;
            newScale *= this.scaleBeforeScaling;
            this.scale = newScale;
            if (!isNaN(this.scale)) {
              grabbedEntityConfig.shouldUpdateScale = true;
            }
          }
        },
        removeHand(hand) {
          if (this.hands.includes(hand)) {
            this.hands.splice(this.hands.indexOf(hand), 1);
          }
        },

        pinchPosition: position.clone(),
        secondHandPinchPosition: new THREE.Vector3(),
        initialDistanceBetweenPinches: 1,

        initialPinchPosition: position.clone(),
        initialEntityQuaternion: entityToGrab.object3D.quaternion.clone(),

        entityPositionRelativeToPinch: entityToGrab.object3D.position
          .clone()
          .sub(position),
        positionOffset: new THREE.Vector3(),

        entityQuaternionRelativeToWrist: entityToGrab.object3D.quaternion
          .clone()
          .premultiply(
            handTrackingComponent.getWristQuaternion().clone().invert()
          ),
        relativeEntityQuaternion: new THREE.Quaternion(),

        initialCameraPosition: new THREE.Vector3(),
        relativeCameraPosition: new THREE.Vector3(),
        initialCameraQuaternion: new THREE.Quaternion(),
        initialCameraQuaternionInverse: new THREE.Quaternion(),
        relativeCameraQuaternion: new THREE.Quaternion(),
        quaternionOffset: new THREE.Quaternion(),
      };

      this.grabbedEntities.set(entityToGrab, grabbedEntityConfig);
    } else {
      grabbedEntityConfig = this.grabbedEntities.get(entityToGrab);
      grabbedEntityConfig.initialDistanceBetweenPinches =
        grabbedEntityConfig.pinchPosition.distanceTo(position);
      grabbedEntityConfig.scaleBeforeScaling = grabbedEntityConfig.scale;
      grabbedEntityConfig.hands.push(handTrackingComponent);
    }

    if (grabbedEntityConfig.physics) {
      entityToGrab.setAttribute("croquet", { physics: false });
    }
    // entityToGrab.setAttribute("croquet", { mass: 0 });

    if (this.cameraMountedEntities.has(entityToGrab)) {
      grabbedEntityConfig.isRelativeToCamera = true;
      this.cameraMountedEntities.set(entityToGrab, grabbedEntityConfig);
    }

    const onPinchMoved =
      grabbedEntityConfig.onPinchMoved.bind(grabbedEntityConfig);
    let onPinchEnded = (event) => {
      grabbedEntityConfig.removeHand(handTrackingComponent);
      handTrackingComponent.el.removeEventListener("pinchmoved", onPinchMoved);
      if (grabbedEntityConfig.hands.length > 0) {
      } else {
        console.log("LET GO");
        this.grabbedEntities.delete(entityToGrab);

        // this.decomposeCameraMatrix();

        grabbedEntityConfig.isRelativeToCamera =
          false && handTrackingComponent.side == "left";
        if (grabbedEntityConfig.isRelativeToCamera) {
          grabbedEntityConfig.initialCameraPosition.copy(
            this.cameraDecomposition.position
          );
          grabbedEntityConfig.initialCameraQuaternion.copy(
            this.cameraDecomposition.quaternion
          );
          grabbedEntityConfig.initialCameraQuaternionInverse
            .copy(this.cameraDecomposition.quaternion)
            .invert();

          grabbedEntityConfig.relativeCameraPosition.subVectors(
            entityToGrab.object3D.position,
            this.cameraDecomposition.position
          );
          grabbedEntityConfig.relativeCameraQuaternion
            .copy(entityToGrab.object3D.quaternion)
            .premultiply(this.cameraDecomposition.quaternion.clone().invert());

          this.cameraMountedEntities.set(entityToGrab, grabbedEntityConfig);
        } else {
          this.cameraMountedEntities.delete(entityToGrab);
        }

        if (grabbedEntityConfig.physics) {
          entityToGrab.setAttribute("croquet", {
            physics: true,
          });
        }
      }
    };
    onPinchEnded = onPinchEnded.bind(this);

    handTrackingComponent.el.addEventListener("pinchmoved", onPinchMoved);
    handTrackingComponent.el.addEventListener("pinchended", onPinchEnded, {
      once: true,
    });
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("key")) {
    }
  },

  tick: function (time, timeDelta) {
    this.entities.forEach((entity) => entity.tick(...arguments));

    if (this.cameraMountedEntities.size > 0 || this.grabbedEntities.size > 0) {
      // this.decomposeCameraMatrix();
    }
    this.grabbedEntities.forEach((grabbedEntityConfig, grabbedEntity) => {
      if (grabbedEntityConfig.shouldUpdatePosition) {
        // grabbedEntity.object3D.position.copy(grabbedEntityConfig.position);
        // grabbedEntity.setAttribute("position", grabbedEntityConfig.position);
        grabbedEntity.updateComponent("position", grabbedEntityConfig.position);
        grabbedEntityConfig.shouldUpdatePosition = false;
      }
      if (grabbedEntityConfig.shouldUpdateQuaternion) {
        // grabbedEntity.object3D.quaternion.copy(grabbedEntityConfig.quaternion);
        grabbedEntityConfig.rotation.setFromQuaternion(
          grabbedEntityConfig.quaternion
        );
        grabbedEntityConfig.rotationVector.setFromEuler(
          grabbedEntityConfig.rotation
        );

        grabbedEntityConfig.rotationVector.multiplyScalar(180 / Math.PI);
        //grabbedEntity.setAttribute("rotation", grabbedEntityConfig.rotation);
        // grabbedEntity.setAttribute("rotation", rotationString);
        if (!isNaN(grabbedEntityConfig.rotationVector.length())) {
          grabbedEntity.updateComponent(
            "rotation",
            grabbedEntityConfig.rotationVector
          );
        }
        grabbedEntityConfig.shouldUpdateQuaternion = false;
      }
      if (grabbedEntityConfig.shouldUpdateScale) {
        // grabbedEntity.object3D.scale.setScalar(grabbedEntityConfig.scale);
        // grabbedEntity.setAttribute("scale", grabbedEntityConfig.scale);
        grabbedEntityConfig.scaleVector.setScalar(grabbedEntityConfig.scale);
        grabbedEntity.updateComponent("scale", grabbedEntityConfig.scaleVector);
        grabbedEntityConfig.shouldUpdateScale = false;
      }
    });

    this.cameraMountedEntities.forEach((grabbedEntityConfig, grabbedEntity) => {
      if (!this.grabbedEntities.has(grabbedEntity)) {
        grabbedEntityConfig.quaternionOffset.multiplyQuaternions(
          this.cameraDecomposition.quaternion,
          grabbedEntityConfig.initialCameraQuaternionInverse
        );
        grabbedEntityConfig.positionOffset
          .copy(grabbedEntityConfig.relativeCameraPosition)
          .applyQuaternion(grabbedEntityConfig.quaternionOffset);
        grabbedEntityConfig.position.addVectors(
          this.cameraDecomposition.position,
          grabbedEntityConfig.positionOffset
        );

        grabbedEntityConfig.quaternion.multiplyQuaternions(
          this.cameraDecomposition.quaternion,
          grabbedEntityConfig.relativeCameraQuaternion
        );

        if (!isNaN(grabbedEntityConfig.position.length())) {
          // grabbedEntity.setAttribute("position", grabbedEntityConfig.position);
          grabbedEntity.updateComponent(
            "position",
            grabbedEntityConfig.position
          );
          // grabbedEntity.object3D.position.copy(grabbedEntityConfig.position);
        }
        if (!isNaN(grabbedEntityConfig.quaternion.length())) {
          grabbedEntityConfig.rotation.setFromQuaternion(
            grabbedEntityConfig.quaternion
          );
          grabbedEntityConfig.rotation.x = THREE.MathUtils.radToDeg(
            grabbedEntityConfig.rotation.x
          );
          grabbedEntityConfig.rotation.y = THREE.MathUtils.radToDeg(
            grabbedEntityConfig.rotation.y
          );
          grabbedEntityConfig.rotation.z = THREE.MathUtils.radToDeg(
            grabbedEntityConfig.rotation.z
          );
          grabbedEntity.updateComponent(
            "rotation",
            grabbedEntityConfig.rotation
          );
          // grabbedEntity.setAttribute("rotation", grabbedEntityConfig.rotation);
          // grabbedEntity.object3D.quaternion.copy(grabbedEntityConfig.quaternion);
        }
      }
    });
  },
});

AFRAME.registerComponent("hand-tracking-controls-controller", {
  schema: {},
  dependencies: ["hand-tracking-controls"],

  getOffsetMatrix() {
    return this.system.cameraEntity.parentEl.object3D.matrixWorld;
  },
  offsetPosition(position) {
    const newPosition = position.clone().applyMatrix4(this.getOffsetMatrix());
    return newPosition;
  },
  offsetQuaternion(quaternion, overwrite) {
    this._quaternion = this._quaternion || new THREE.Quaternion();
    this._quaternion.setFromRotationMatrix(this.getOffsetMatrix());
    if (overwrite) {
      quaternion.premultiply(this._quaternion);
      return quaternion;
    } else {
      const newQuaternion = quaternion.clone().premultiply(this._quaternion);
      return newQuaternion;
    }
  },
  getWristQuaternion() {
    let quaternion = this.jointAPI.getWrist().getQuaternion();
    quaternion = this.offsetQuaternion(quaternion);
    return quaternion;
  },

  init: function () {
    this.box = new THREE.Box3();

    this.handTrackingControls = this.el.components["hand-tracking-controls"];
    this.side = this.handTrackingControls.data.hand;

    this.el.addEventListener("hand-tracking-extras-ready", (event) => {
      const { jointAPI } = event.detail.data;
      this.jointAPI = jointAPI;
    });

    this.el.addEventListener("pinchstarted", (event) => {
      if (!this.jointAPI) {
        return;
      }

      let { position } = event.detail;
      position = this.offsetPosition(position);

      let closestEntity;
      let closestEntityDistance = this.system.data.distanceThreshold;
      // this.box.makeEmpty();
      this.system.targetEntities.forEach((entity) => {
        this.box.setFromObject(entity.object3D);

        // const distanceToEntity = position.distanceTo(entity.object3D.position);
        const distanceToEntity = this.box.distanceToPoint(position);
        if (distanceToEntity < closestEntityDistance) {
          closestEntityDistance = distanceToEntity;
          closestEntity = entity;
        }
      });

      if (closestEntity) {
        this.system.grabEntity(closestEntity, this, position);
      }
    });

    this.system.addEntity(this);
  },

  tick: function () {},
  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("key")) {
    }
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
