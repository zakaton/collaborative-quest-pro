/* global AFRAME, Croquet, THREE, Q */

THREE.Math = THREE.MathUtils

import View from "./view/View.js";
import Model from "./model/Model.js";

function log(string, ...etc) {
  if (!Q.LOGGING.index) return;
  console.groupCollapsed(`[System] ${string}`, ...etc);
  console.trace(); // hidden in collapsed group
  console.groupEnd();
}

// grab the main A-Frame scene
const sceneEntity = document.querySelector("a-scene")
sceneEntity.addEventListener("loaded", event => {
  log("A-Frame scene has loaded");
  sceneEntity.emit("createcroquetsession", { Model, View });
})

/*
const scene = AFRAME.scenes[0];
if (scene) {
  // Because modules load after the document/scene loads, we can't register the system/component in this file
  // instead wait for the scene to load before creating the session
  // otherwise the registered "croquet" system won't receive the emitted "createcroquetsession" event containing the Model/View
  const onSceneLoaded = () => {
    log("A-Frame scene has loaded");
    scene.emit("createcroquetsession", { Model, View });
  };

  log("Waiting for A-Frame scene to load...");
  if (scene.hasLoaded) {
    onSceneLoaded();
  } else {
    scene.addEventListener("loaded", event => onSceneLoaded(), { once: true });
  }
} else {
  console.warn("A-Frame scene not found in document");
}
*/