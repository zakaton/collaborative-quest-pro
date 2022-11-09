/* global AFRAME, THREE */

AFRAME.registerComponent("hand-tracking-controls-proxy", {
  schema: {
    hand: { default: "right", oneOf: ["left", "right"] },
    modelStyle: { default: "mesh", oneOf: ["mesh"] },
    modelColor: { default: "white" },
  },

  addEventListeners: function () {
    this.el.addEventListener("model-loaded", this.onModelLoaded);
    for (var i = 0; i < this.jointEls.length; ++i) {
      this.jointEls[i].object3D.visible = true;
    }
  },

  removeEventListeners: function () {
    this.el.removeEventListener("model-loaded", this.onModelLoaded);
    for (var i = 0; i < this.jointEls.length; ++i) {
      this.jointEls[i].object3D.visible = false;
    }
  },

  init: function () {
    this.LEFT_HAND_MODEL_URL =
      "https://cdn.aframe.io/controllers/oculus-hands/v3/left.glb";
    this.RIGHT_HAND_MODEL_URL =
      "https://cdn.aframe.io/controllers/oculus-hands/v3/right.glb";

    this.BONE_PREFIX = {
      left: "b_l_",
      right: "b_r_",
    };

    var sceneEl = this.el.sceneEl;
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.jointEls = [];
    this.addEventListeners();
    this.controllerPresent = false;
    this.initDefaultModel();
  },

  tick: function () {
    return;
    if (this.mesh && this.data.source) {
      this.el.object3D.position.set(0, 0, 0);
      this.el.object3D.rotation.set(0, 0, 0);
      this.updateHandModel();
    }
  },

  updateHandModel: function () {
    if (this.data.modelStyle === "mesh") {
      this.updateHandMeshModel();
    }
  },

  getBone: function (name) {
    var bones = this.bones;
    for (var i = 0; i < bones.length; i++) {
      if (bones[i].name === name) {
        return bones[i];
      }
    }
    return null;
  },

  updateHandMeshModel: function () {
    this.mesh.visible = false;
    const skeleton =
      this.data.source.components?.["hand-tracking-controls"]?.skinnedMesh
        ?.skeleton;
    if (skeleton) {
      this.bones.forEach((bone) => {
        const _bone = skeleton.getBoneByName(bone.name);
        if (_bone) {
          bone.copy(_bone);
          this.mesh.visible = true;
        }
      });
    }
  },

  initDefaultModel: function () {
    if (this.el.getObject3D("mesh")) {
      return;
    }
    if (this.data.modelStyle === "mesh") {
      this.initMeshHandModel();
    }
  },

  initMeshHandModel: function () {
    var modelURL =
      this.data.hand === "left"
        ? this.LEFT_HAND_MODEL_URL
        : this.RIGHT_HAND_MODEL_URL;
    this.el.setAttribute("gltf-model", modelURL);
  },

  onModelLoaded: function () {
    var mesh = (this.mesh = this.el.getObject3D("mesh").children[0]);
    var skinnedMesh = (this.skinnedMesh = mesh.children[30]);
    if (!this.skinnedMesh) {
      return;
    }
    this.bones = skinnedMesh.skeleton.bones;
    this.el.removeObject3D("mesh");
    mesh.position.set(0, 1.5, 0);
    mesh.rotation.set(0, 0, 0);
    skinnedMesh.frustumCulled = false;
    skinnedMesh.material = new THREE.MeshStandardMaterial({
      skinning: true,
      color: this.data.modelColor,
    });
    this.el.setObject3D("mesh", mesh);
    this.mesh.visible = false;
  },
});
