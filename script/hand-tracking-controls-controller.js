/* global AFRAME, THREE */

AFRAME.registerSystem("hand-tracking-controls-controller", {
  schema: {
    targetEntities: { type: "string", default: "[croquet]" },
    handEntities: { type: "selectorAll", default: "[hand-tracking-controls]" },
    distanceThreshold: { type: "number", default: 0.3 },
  },

  init: function () {
    window.sceneComponent = this;

    this.cameraEntity = this.el.querySelector("a-camera");

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

    const config = { childList: true, subtree: true };
    const callback = (mutationList, observer) => {
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
        hands: [handTrackingComponent],
        shouldUpdatePosition: false,
        shouldUpdateQuaternion: false,
        shouldUpdateScale: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        scale: entityToGrab.object3D.scale.x,
        isRelativeToCamera: false,
        component: this,
        //camera: this.cameraEntity,
        onPinchMoved(event) {
          const handTrackingComponent =
            event.target.components["hand-tracking-controls"];
          const { position } = event.detail;
          const isFirstHand = this.hands[0].el == handTrackingComponent.el;

          if (isFirstHand) {
            this.quaternion.multiplyQuaternions(
              this.hands[0].jointAPI.getWrist().getQuaternion(),
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
            handTrackingComponent.jointAPI
              .getWrist()
              .getQuaternion()
              .clone()
              .invert()
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

        grabbedEntityConfig.isRelativeToCamera =
          handTrackingComponent.side == "left";
        if (grabbedEntityConfig.isRelativeToCamera) {
          grabbedEntityConfig.initialCameraPosition.copy(
            this.cameraEntity.object3D.position
          );
          grabbedEntityConfig.initialCameraQuaternion.copy(
            this.cameraEntity.object3D.quaternion
          );
          grabbedEntityConfig.initialCameraQuaternionInverse
            .copy(this.cameraEntity.object3D.quaternion)
            .invert();

          grabbedEntityConfig.relativeCameraPosition.subVectors(
            entityToGrab.object3D.position,
            this.cameraEntity.object3D.position
          );
          grabbedEntityConfig.relativeCameraQuaternion
            .copy(entityToGrab.object3D.quaternion)
            .premultiply(
              this.cameraEntity.object3D.quaternion.clone().invert()
            );

          this.cameraMountedEntities.set(entityToGrab, grabbedEntityConfig);
        } else {
          this.cameraMountedEntities.delete(entityToGrab);
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

    this.grabbedEntities.forEach((grabbedEntityConfig, grabbedEntity) => {
      if (grabbedEntityConfig.shouldUpdatePosition) {
        grabbedEntity.object3D.position.copy(grabbedEntityConfig.position);
        delete grabbedEntityConfig.shouldUpdatePosition;
      }
      if (grabbedEntityConfig.shouldUpdateQuaternion) {
        grabbedEntity.object3D.quaternion.copy(grabbedEntityConfig.quaternion);
        delete grabbedEntityConfig.shouldUpdateQuaternion;
      }
      if (grabbedEntityConfig.shouldUpdateScale) {
        grabbedEntity.object3D.scale.setScalar(grabbedEntityConfig.scale);
        delete grabbedEntityConfig.shouldUpdateScale;
      }
    });

    this.cameraMountedEntities.forEach((grabbedEntityConfig, grabbedEntity) => {
      if (!this.grabbedEntities.has(grabbedEntity)) {
        grabbedEntityConfig.quaternionOffset.multiplyQuaternions(
          this.cameraEntity.object3D.quaternion,
          grabbedEntityConfig.initialCameraQuaternionInverse
        );
        grabbedEntityConfig.positionOffset
          .copy(grabbedEntityConfig.relativeCameraPosition)
          .applyQuaternion(grabbedEntityConfig.quaternionOffset);
        grabbedEntityConfig.position.addVectors(
          this.cameraEntity.object3D.position,
          grabbedEntityConfig.positionOffset
        );

        grabbedEntityConfig.quaternion.multiplyQuaternions(
          this.cameraEntity.object3D.quaternion,
          grabbedEntityConfig.relativeCameraQuaternion
        );

        if (!isNaN(grabbedEntityConfig.position.length())) {
          grabbedEntity.object3D.position.copy(grabbedEntityConfig.position);
        }
        if (!isNaN(grabbedEntityConfig.quaternion.length())) {
          grabbedEntity.object3D.quaternion.copy(
            grabbedEntityConfig.quaternion
          );
        }
      }
    });
  },
});

AFRAME.registerComponent("hand-tracking-controls-controller", {
  schema: {},
  dependencies: ["hand-tracking-controls"],

  init: function () {
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

      const { position } = event.detail;

      let closestEntity;
      let closestEntityDistance = this.system.data.distanceThreshold;
      this.system.targetEntities.forEach((entity) => {
        const distanceToEntity = position.distanceTo(entity.object3D.position);
        //console.log("distance", distanceToEntity, entity, closestEntityDistance);
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
