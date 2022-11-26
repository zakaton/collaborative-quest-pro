/* global AFRAME, THREE */

// Mirror Material component for A-Frame by Alfredo Consebola 2017.
AFRAME.registerComponent("mirror", {
  schema: {
    resolution: {
      type: "number",
      default: 128,
    },
    refraction: {
      type: "number",
      default: 0.95,
    },
    color: {
      type: "color",
      default: 0xffffff,
    },
    distance: {
      type: "number",
      default: 1000,
    },
    interval: {
      type: "number",
      default: 1000,
    },
    repeat: {
      type: "boolean",
      default: false,
    },
    layer: {
      type: "number",
      default: 0,
    },
    yOffset: {
      type: "number",
      default: 0,
    },
  },
  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,
  init: function () {
    this.counter = this.data.interval;
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(
      this.data.resolution,
      {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      }
    );
    this.target = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();
    this.targetEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this.cam = new THREE.CubeCamera(0.5, this.data.distance, cubeRenderTarget);
    this.cam.layers.enable(this.data.layer);
    this.cam.position.y += this.data.yOffset;
    this.el.object3D.add(this.cam);
    this.mirrorMaterial = new THREE.MeshBasicMaterial({
      color: this.data.color,
      refractionRatio: this.data.refraction,
      envMap: this.cam.renderTarget.texture,
    });
    this.done = false;
    var mirrormat = this.mirrorMaterial;
    this.mesh = this.el.getObject3D("mesh");
    if (this.mesh) {
      this.mesh.traverse(function (child) {
        if (child instanceof THREE.Mesh) child.material = mirrormat;
      });
    }
  },
  tick: function (t, dt) {
    if (!this.done) {
      if (this.counter > 0) {
        this.counter -= dt;
      } else {
        this.mesh = this.el.getObject3D("mesh");
        if (this.mesh) {
          this.mesh.visible = false;
          this.el.object3D.getWorldPosition(this.target);
          this.target.y += this.data.yOffset;
          this.cam.position = this.target;
          this.el.object3D.getWorldQuaternion(this.targetQuaternion);
          this.targetEuler.setFromQuaternion(this.targetQuaternion);
          this.targetEuler.y += Math.PI;
          this.cam.rotation.copy(this.targetEuler);
          // this.el.sceneEl.object3D.updateMatrixWorld()
          this.cam.update(AFRAME.scenes[0].renderer, this.el.sceneEl.object3D);
          var mirrormat = this.mirrorMaterial;
          this.mesh.traverse(function (child) {
            if (child instanceof THREE.Mesh) child.material = mirrormat;
          });
          this.mesh.visible = true;
          if (!this.data.repeat) {
            this.done = true;
            this.counter = this.data.interval;
          }
        }
      }
    }
  },
});
