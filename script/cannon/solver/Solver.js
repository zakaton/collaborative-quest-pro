/* global Croquet */

class Solver extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Solver"]) return;

    console.groupCollapsed(`[Solver-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();
    
    this.equations = [];
  }

  /**
   * Should be implemented in subclasses!
   * @method solve
   * @param  {Number} dt
   * @param  {World} world
   * @return {Number} number of iterations performed
   */
  solve(dt, world) {
    return (
      // Should return the number of iterations done!
      0
    );
  }

  /**
   * Add an equation
   * @method addEquation
   * @param {Equation} eq
   */
  addEquation(eq) {
    if (eq.enabled && !eq.bi.isTrigger && !eq.bj.isTrigger) {
      this.equations.push(eq);
    }
  }

  /**
   * Remove an equation
   * @method removeEquation
   * @param {Equation} eq
   */
  removeEquation(eq) {
    const eqs = this.equations;
    const i = eqs.indexOf(eq);
    if (i !== -1) {
      eqs.splice(i, 1);
    }
  }

  /**
   * Add all equations
   * @method removeAllEquations
   */
  removeAllEquations() {
    this.equations.length = 0;
  }
}
Solver.register("CANNON.Solver");

export { Solver };
