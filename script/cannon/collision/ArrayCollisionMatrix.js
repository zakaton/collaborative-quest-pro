// https://github.com/pmndrs/cannon-es/blob/master/src/collision/ArrayCollisionMatrix.ts

/* global Croquet */

class ArrayCollisionMatrix extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ArrayCollisionMatrix"]) return;

    console.groupCollapsed(`[ArrayCollisionMatrix-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();
    this.log("Constructor Start");
    this.matrix = [];
    this.log("Constructor End");
  }

  /**
   * Get an element
   * @method get
   * @param  {Body} bi
   * @param  {Body} bj
   * @return {Number}
   */
  get(bi, bj) {
    let { index: i } = bi;
    let { index: j } = bj;
    if (j > i) {
      const temp = j;
      j = i;
      i = temp;
    }
    return this.matrix[((i * (i + 1)) >> 1) + j - 1];
  }

  /**
   * Set an element
   * @method set
   * @param {Body} bi
   * @param {Body} bj
   * @param {boolean} value
   */
  set(bi, bj, value) {
    let { index: i } = bi;
    let { index: j } = bj;
    if (j > i) {
      const temp = j;
      j = i;
      i = temp;
    }
    this.matrix[((i * (i + 1)) >> 1) + j - 1] = value ? 1 : 0;
  }

  /**
   * Sets all elements to zero
   * @method reset
   */
  reset() {
    for (let i = 0, l = this.matrix.length; i !== l; i++) {
      this.matrix[i] = 0;
    }
  }

  /**
   * Sets the max number of objects
   * @method setNumObjects
   * @param {Number} n
   */
  setNumObjects(n) {
    this.matrix.length = (n * (n - 1)) >> 1;
  }
}
ArrayCollisionMatrix.register("CANNON.ArrayCollisionMatrix");

export { ArrayCollisionMatrix };
