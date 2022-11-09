/* global Croquet */

class Pool extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Pool"]) return;

    console.groupCollapsed(`[Pool-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();
    
    this.objects = [];
    this.type = "Object";
  }

  /**
   * Release an object after use
   * @method release
   * @param {Object} obj
   */
  release(...args) {
    const Nargs = args.length;
    for (let i = 0; i !== Nargs; i++) {
      this.objects.push(args[i]);
    }
    return this;
  }

  /**
   * Get an object
   * @method get
   * @return {mixed}
   */
  get() {
    if (this.objects.length === 0) {
      return this.constructObject();
    } else {
      return this.objects.pop();
    }
  }

  /**
   * Construct an object. Should be implemented in each subclass.
   * @method constructObject
   * @return {mixed}
   */
  constructObject() {
    throw new Error(
      "constructObject() not implemented in this Pool subclass yet!"
    );
  }

  /**
   * @method resize
   * @param {number} size
   * @return {Pool} Self, for chaining
   */
  resize(size) {
    const objects = this.objects;

    while (objects.length > size) {
      objects.pop();
    }

    while (objects.length < size) {
      objects.push(this.constructObject());
    }

    return this;
  }
}
Pool.register("CANNON.Pool");

export { Pool };
