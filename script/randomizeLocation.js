// instead of having everyone show up at the same position, we'll randomize the starting position

/* global AFRAME */
if (AFRAME.scenes.length) {
  const scene = AFRAME.scenes[0];
  const camera = scene.querySelector("a-camera");
  if (camera) {
    const x = (Math.random() * 10) - 5;
    const z = (Math.random() * 4) + 4;
    camera.setAttribute("position", `${x} 1 ${z}`);
  }
}