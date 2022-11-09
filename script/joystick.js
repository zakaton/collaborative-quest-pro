// adds the "joystick" and "vr-mode-ui: enabled: false;" attributes to the <a-scene /> entity if playing on mobile

/* global AFRAME */

if (AFRAME.utils.device.isMobile()) {
  const scene = AFRAME.scenes[0];
  scene.setAttribute("joystick", "");
  scene.setAttribute("vr-mode-ui", "enabled: false");
}