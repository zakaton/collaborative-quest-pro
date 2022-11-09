/* global Croquet, AFRAME, Q */

class DemosView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log("Creating DemoView");

    this.scene = AFRAME.scenes[0];
    this.entities = [];
    
    this.tagNames = ["a-box", "a-sphere", "a-cylinder", "a-torus", "a-cone", "a-icosahedron", "a-octahedron", "a-tetrahedron", "a-torus-knot"];

    this.subscribe(this.sessionId, "change-room", this.onRoomChange);
  }

  log(string, ...etc) {
    if (!Q.LOGGING.DemosView) return;

    console.groupCollapsed(`[DemoView] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  // helper function for broadcasting
  broadcast(scope, event, data) {
    this.publish(this.sessionId, "broadcast", { scope, event, data });
  }

  // if you want to move everyone in the session to a new url, e.g. a new session with a different layout "?q=someOtherName"
  changeRoom(roomName) {
    if (typeof roomName === "string") {
      this.broadcast(this.sessionId, "change-room", roomName);
    }
  }

  onRoomChange(roomName) {
    const url = new URL(location);
    url.searchParams.set("q", roomName);
    location.href = url.href;
  }

  // a quick way to generate a bunch of random entities
  createABunchOfEntities(numberOfEntities = 10) {
    this.log(`Creating ${numberOfEntities} entities...`);
    for (let index = 0; index < numberOfEntities; index++) {
      const tagNameIndex = Math.floor(this.tagNames.length * Math.random());
      const tagName = this.tagNames[tagNameIndex];
      
      this.log(`Creating a ${tagName} entity`)
      
      const entity = document.createElement(tagName);
      
      let color = "#";
      // generating a random string of 6 hex values for our color (RRGGBB)
      for (let colorIndex = 0; colorIndex < 6; colorIndex++) {
        color += Math.floor(Math.random() * 16).toString(16);
      }
      entity.setAttribute("color", color);
      entity.setAttribute("croquet", "");
      
      entity.setAttribute("position", `${(Math.random() * 100) - 50} ${(Math.random() * 25) + 1} ${(Math.random() * 100) - 50}`);
      entity.setAttribute("scale", `${(Math.random() * 1.5) + 0.5} ${(Math.random() * 1.5) + 0.5} ${(Math.random() * 1.5) + 0.5}`);
      entity.setAttribute("rotation", `${Math.random() * 360} ${Math.random() * 360} ${Math.random() * 360}`);
      
      this.entities.push(entity);
      this.scene.appendChild(entity);
    }
  }

  removeEntities() {
    this.entities.forEach(entity => {
      entity.remove();
    });
    this.entities.length = 0;
  }

  detach() {
    super.detach();
    this.log(`detaching`);
  }
}

export default DemosView;
