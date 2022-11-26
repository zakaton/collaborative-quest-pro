/* global AFRAME, THREE */
AFRAME.registerComponent("camera-controls", {
  schema: {
    scalar: { type: "number", default: 0.01 },
    hand: { default: "right", oneOf: ["left", "right"] },
    toggleVisibility: {
      type: "selectorAll",
      default: "[data-toggle-visibility]",
    },
  },
  init: function () {
    this.cameraPosition = document.getElementById("cameraPosition");
    this.cameraRotation = document.getElementById("cameraRotation");
    this.camera = document.querySelector("a-camera");
    this.positionOffset = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.quaternion = new THREE.Quaternion();

    this.el.addEventListener("thumbstickmoved", this.controlCamera.bind(this));
    this.el.addEventListener("abuttonup", this.toggleVisibility.bind(this));
    this.showEntities = true;
  },
  controlCamera: function (event) {
    let { x, y } = event.detail;
    x *= this.data.scalar;
    y *= this.data.scalar;
    if (this.data.hand == "left") {
      this.positionOffset.set(x, 0, y);
      this.camera.object3D.getWorldQuaternion(this.quaternion);
      this.euler.setFromQuaternion(this.quaternion);
      this.euler.x = this.euler.z = 0;
      this.positionOffset.applyEuler(this.euler);
      this.cameraPosition.object3D.position.add(this.positionOffset);
    } else {
      this.cameraRotation.object3D.rotation.y += -x;
    }
  },
  toggleVisibility: function () {
    this.showEntities = !this.showEntities;
    this.data.toggleVisibility.forEach((entity) => {
      if (entity.dataset.colorWrite) {
        const gltfModel = entity.components["gltf-model"]?.model;
        if (gltfModel) {
          gltfModel.traverseVisible((x) => {
            const { material } = x;
            if (material) {
              material.colorWrite = this.showEntities;
            }
          });
        }
      } else {
        entity.setAttribute("visible", this.showEntities);
      }
    });
  },
});
