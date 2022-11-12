/* global AFRAME, Croquet, THREE, Q */

THREE.Math = THREE.MathUtils;

import View from "./view/View.js";
import Model from "./model/Model.js";

function log(string, ...etc) {
  if (!Q.LOGGING.index) return;
  console.groupCollapsed(`[System] ${string}`, ...etc);
  console.trace(); // hidden in collapsed group
  console.groupEnd();
}

// grab the main A-Frame scene
const sceneEntity = document.querySelector("a-scene");
sceneEntity.addEventListener("loaded", (event) => {
  log("A-Frame scene has loaded");
  sceneEntity.emit("createcroquetsession", { Model, View });
});
