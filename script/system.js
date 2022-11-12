/* global AFRAME, Croquet, THREE, Q */

// https://aframe.io/docs/1.2.0/core/systems.html#registering-a-system
AFRAME.registerSystem("croquet", {
  init: function () {
    this.entities = [];

    this.log("Setting up Croquet A-Frame system");

    this.sceneEl.addEventListener(
      "createcroquetsession",
      (event) => {
        const { Model, View } = event.detail;
        // https://croquet.studio/sdk/docs/Session.html#.join
        Croquet.Session.join({
          appId: "me.glitch.collaborative_quest_pro", // change the appId to your own custom string when remixing
          name: Croquet.App.autoSession(),
          password: "secret",

          model: Model,
          view: View,

          autoSleep: false,
          step: "manual",

          debug: [],
        }).then((session) => {
          this.session = session;

          this.log(
            `Created Croquet Session with Session id "${session.id}", and we have a viewId of "${session.view.viewId}"`
          );
          document.title = `Hello, WebVR! | ${Croquet.App.autoSession()}`;

          // also make the croquet session globally available for debugging
          window.croquetSession = session;
        });
      },
      { once: true }
    );
  },

  log(string, ...etc) {
    if (!Q.LOGGING.system) return;

    console.groupCollapsed(`[System] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  },

  // https://aframe.io/docs/1.2.0/core/systems.html#methods_tick
  tick: function (time, timeDelta) {
    if (this.session) {
      // we set the "step" option in Croquet.Session.join to "manual", so we use A-FRAME's "tick" function to trigger the view's "update" method and model's "step" method
      // if we didn't (with the default value being "auto"), then model.future() and view.update() wouldn't trigger in "VR Mode")
      this.session.step(time);
    }
  },

  // when an entity with a "croquet" attribute is added to the scene
  addEntity: function (el) {
    this.log(`Adding entity to this.entities`, el);
    this.entities.push(el);
    this.sceneEl.emit("croquetentityadded", { el });
  },

  // when an entity with a "croquet" attribute is removed to the scene
  removeEntity: function (el) {
    this.log(`Removing entity from this.entities`, el);
    const index = this.entities.indexOf(el);
    this.entities.splice(index, 1);
    this.sceneEl.emit("croquetentityremoved", { el });
  },
});
