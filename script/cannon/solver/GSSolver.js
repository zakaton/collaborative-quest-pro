import { Solver } from "../solver/Solver.js";

/* global Croquet */

class GSSolver extends Solver {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.GSSolver"]) return;

    console.groupCollapsed(`[GSSolver-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init() {
    super.init();

    this.iterations = 10;
    this.tolerance = 1e-7;

    // TEMP VALUES
    this.GSSolver_solve_lambda = []; // Just temporary number holders that we want to reuse each solve.
    this.GSSolver_solve_invCs = [];
    this.GSSolver_solve_Bs = [];
  }

  /**
   * Solve
   * @method solve
   * @param  {Number} dt
   * @param  {World} world
   * @return {Number} number of iterations performed
   */
  solve(dt, world) {
    let iter = 0;
    const maxIter = this.iterations;
    const tolSquared = this.tolerance * this.tolerance;
    const equations = this.equations;
    const Neq = equations.length;
    const bodies = world.bodies;
    const Nbodies = bodies.length;
    const h = dt;
    let q;
    let B;
    let invC;
    let deltalambda;
    let deltalambdaTot;
    let GWlambda;
    let lambdaj;
    
    // Update solve mass
    if (Neq !== 0) {
      for (let i = 0; i !== Nbodies; i++) {
        bodies[i].updateSolveMassProperties();
      }
    }

    // Things that does not change during iteration can be computed once
    const invCs = this.GSSolver_solve_invCs;

    const Bs = this.GSSolver_solve_Bs;
    const lambda = this.GSSolver_solve_lambda;
    invCs.length = Neq;
    Bs.length = Neq;
    lambda.length = Neq;
    for (let i = 0; i !== Neq; i++) {
      const c = equations[i];
      lambda[i] = 0.0;
      Bs[i] = c.computeB(h);
      invCs[i] = 1.0 / c.computeC();
    }
    
    if (Neq !== 0) {
      // Reset vlambda
      for (let i = 0; i !== Nbodies; i++) {
        const b = bodies[i];
        const vlambda = b.vlambda;
        const wlambda = b.wlambda;
        vlambda.set(0, 0, 0);
        wlambda.set(0, 0, 0);
      }

      // Iterate over equations
      for (iter = 0; iter !== maxIter; iter++) {
        // Accumulate the total error for each iteration.
        deltalambdaTot = 0.0;

        for (let j = 0; j !== Neq; j++) {
          const c = equations[j];
          // Compute iteration
          B = Bs[j];
          invC = invCs[j];
          lambdaj = lambda[j];
          GWlambda = c.computeGWlambda();
          deltalambda = invC * (B - GWlambda - c.eps * lambdaj);
          // Clamp if we are not within the min/max interval
          if (lambdaj + deltalambda < c.minForce) {
            deltalambda = c.minForce - lambdaj;
          } else if (lambdaj + deltalambda > c.maxForce) {
            deltalambda = c.maxForce - lambdaj;
          }
          lambda[j] += deltalambda;
          deltalambdaTot += deltalambda > 0.0 ? deltalambda : -deltalambda; // abs(deltalambda)
          c.addToWlambda(deltalambda);
        }

        // If the total error is small enough - stop iterate
        if (deltalambdaTot * deltalambdaTot < tolSquared) {
          break;
        }
      }
      
      // Add result to velocity
      for (let i = 0; i !== Nbodies; i++) {
        const b = bodies[i];
        const v = b.velocity;
        const w = b.angularVelocity;
                
        b.vlambda.vmul(b.linearFactor, b.vlambda);
        v.vadd(b.vlambda, v);        

        b.wlambda.vmul(b.angularFactor, b.wlambda);
        w.vadd(b.wlambda, w);
      }

      // Set the .multiplier property of each equation
      let l = equations.length;
      const invDt = 1 / h;
      while (l--) {
        equations[l].multiplier = lambda[l] * invDt;
      }
    }

    return iter;
  }
}
GSSolver.register("CANNON.GSSolver");

export { GSSolver };
