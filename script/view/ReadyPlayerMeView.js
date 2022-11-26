/* global Croquet, AFRAME, Q */

class ReadyPlayerMeView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log(`Creating ReadyPlayerMeView`);

    // grabing the rig entity
    this.scene = AFRAME.scenes[0];
    this.entity = this.scene.querySelector("#rig");
  }

  log(string, ...etc) {
    if (!Q.LOGGING.ReadyPlayerMeView) return;

    console.groupCollapsed(`[ReadyPlayerMeView] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
}

export default ReadyPlayerMeView;
