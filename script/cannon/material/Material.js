/* global Croquet */

class Material extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Material"]) return;

    console.groupCollapsed(`[Material-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    super.init();

    let name = "";

    // Backwards compatibility fix
    if (typeof options === "string") {
      name = options;
      options = {};
    }
    
    this.name = name;
    this._id = Number(this.id.split('/M')[1]);
    this.friction =
      typeof options.friction !== "undefined" ? options.friction : -1;
    this.restitution =
      typeof options.restitution !== "undefined" ? options.restitution : -1;
  }
}
Material.register("CANNON.Material");

export { Material };
