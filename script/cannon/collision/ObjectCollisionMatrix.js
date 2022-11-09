/* global Croquet */

class ObjectCollisionMatrix extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ObjectCollisionMatrix"]) return;

    console.groupCollapsed(`[ObjectCollisionMatrix-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();
    this.matrix = {};
  }

  /**
   * @method get
   * @param  {Body} bi
   * @param  {Body} bj
   * @return {boolean}
   */
  get(bi, bj) {
    let { _id: i } = bi;
    let { _id: j } = bj;
    if (j > i) {
      const temp = j;
      j = i;
      i = temp;
    }
    return `${i}-${j}` in this.matrix;
  }

  /**
   * @method set
   * @param  {Body} bi
   * @param  {Body} bj
   * @param {boolean} value
   */
  set(bi, bj, value) {
    let { _id: i } = bi;
    let { _id: j } = bj;
    if (j > i) {
      const temp = j;
      j = i;
      i = temp;
    }
    if (value) {
      this.matrix[`${i}-${j}`] = true;
    } else {
      delete this.matrix[`${i}-${j}`];
    }
  }

  /**
   * Empty the matrix
   * @method reset
   */
  reset() {
    this.matrix = {};
  }

  /**
   * Set max number of objects
   * @method setNumObjects
   * @param {Number} n
   */
  setNumObjects(n) {}
}
ObjectCollisionMatrix.register("CANNON.ObjectCollisionMatrix");

export { ObjectCollisionMatrix };
