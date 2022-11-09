/* global Croquet */

class TupleDictionary {
  constructor(data) {
    this.data = data || {
      keys: []
    };
  }

  /**
   * @method get
   * @param  {Number} i
   * @param  {Number} j
   * @return {Object}
   */
  get(i, j) {
    if (i > j) {
      // swap
      const temp = j;
      j = i;
      i = temp;
    }
    return this.data[`${i}-${j}`];
  }

  /**
   * @method set
   * @param  {Number} i
   * @param  {Number} j
   * @param {Object} value
   */
  set(i, j, value) {
    if (i > j) {
      const temp = j;
      j = i;
      i = temp;
    }
    const key = `${i}-${j}`;

    // Check if key already exists
    if (!this.get(i, j)) {
      this.data.keys.push(key);
    }

    this.data[key] = value;
  }

  /**
   * @method reset
   */
  reset() {
    const data = this.data;
    const keys = data.keys;
    while (keys.length > 0) {
      const key = keys.pop();
      delete data[key];
    }
  }
  
  static write(tupleDictionary) {
    const {data} =tupleDictionary
    return JSON.stringify(data);
  }
  static read(dataString) {
    const data = JSON.parse(dataString);
    return new this(data);
  }
}

export { TupleDictionary };
