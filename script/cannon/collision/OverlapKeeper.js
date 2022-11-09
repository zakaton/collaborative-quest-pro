/* global Croquet */

class OverlapKeeper extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.OverlapKeeper"]) return;

    console.groupCollapsed(`[OverlapKeeper-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();

    this.current = [];
    this.previous = [];
  }

  getKey(i, j) {
    if (j < i) {
      const temp = j;
      j = i;
      i = temp;
    }
    return (i << 16) | j;
  }

  /**
   * @method set
   * @param {Number} i
   * @param {Number} j
   */
  set(i, j) {
    // Insertion sort. This way the diff will have linear complexity.
    const key = this.getKey(i, j);
    const current = this.current;
    let index = 0;
    while (key > current[index]) {
      index++;
    }
    if (key === current[index]) {
      return; // Pair was already added
    }
    for (let j = current.length - 1; j >= index; j--) {
      current[j + 1] = current[j];
    }
    current[index] = key;
  }

  /**
   * @method tick
   */
  tick() {
    const tmp = this.current;
    this.current = this.previous;
    this.previous = tmp;
    this.current.length = 0;
  }

  /**
   * @method getDiff
   * @param  {array} additions
   * @param  {array} removals
   */
  getDiff(additions, removals) {
    const a = this.current;
    const b = this.previous;
    const al = a.length;
    const bl = b.length;

    let j = 0;
    for (let i = 0; i < al; i++) {
      let found = false;
      const keyA = a[i];
      while (keyA > b[j]) {
        j++;
      }
      found = keyA === b[j];

      if (!found) {
        this.unpackAndPush(additions, keyA);
      }
    }
    j = 0;
    for (let i = 0; i < bl; i++) {
      let found = false;
      const keyB = b[i];
      while (keyB > a[j]) {
        j++;
      }
      found = a[j] === keyB;

      if (!found) {
        this.unpackAndPush(removals, keyB);
      }
    }
  }

  unpackAndPush(array, key) {
    array.push((key & 0xffff0000) >> 16, key & 0x0000ffff);
  }
}
OverlapKeeper.register("CANNON.OverlapKeeper");

export { OverlapKeeper };
