import { Solver } from "../solver/Solver.js";
import { Body } from "../objects/Body.js";
import { GSSolver } from "./GSSolver.js";

/* global Croquet */

class SplitSolver extends Solver {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.SplitSolver"]) return;

    console.groupCollapsed(`[SplitSolver-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  
  init(options = {}) {
    super.init();
    
    this.iterations = 10;
    this.tolerance = 1e-7;
    this.subsolver = options.subsolver;
    this.nodes = [];
    this.nodePool = [];

    // Create needed nodes, reuse if possible
    while (this.nodePool.length < 128) {
      this.nodePool.push(this.createNode());
    }

    // TEMP VALUES
    this.SplitSolver_solve_nodes = []; // All allocated node objects
    this.SplitSolver_solve_nodePool = []; // All allocated node objects
    this.SplitSolver_solve_eqs = []; // Temp array
    this.SplitSolver_solve_bds = []; // Temp array
    this.SplitSolver_solve_dummyWorld = { bodies: [] }; // Temp object

    this.queue = [];
  }

  get STATIC() {
    return Body.STATIC;
  }

  createNode() {
    return { body: null, children: [], eqs: [], visited: false };
  }

  /**
   * Solve the subsystems
   * @method solve
   * @param  {Number} dt
   * @param  {World} world
   * @return {Number} number of iterations performed
   */
  solve(dt, world) {
    const nodes = this.SplitSolver_solve_nodes;
    const nodePool = this.nodePool;
    const bodies = world.bodies;
    const equations = this.equations;
    const Neq = equations.length;
    const Nbodies = bodies.length;
    const subsolver = this.subsolver;
    
    // Create needed nodes, reuse if possible
    while (nodePool.length < Nbodies) {
      nodePool.push(this.createNode());
    }
    nodes.length = Nbodies;
    for (let i = 0; i < Nbodies; i++) {
      nodes[i] = nodePool[i];
    }

    // Reset node values
    for (let i = 0; i !== Nbodies; i++) {
      const node = nodes[i];
      node.body = bodies[i];
      node.children.length = 0;
      node.eqs.length = 0;
      node.visited = false;
    }
    for (let k = 0; k !== Neq; k++) {
      const eq = equations[k];
      const i = bodies.indexOf(eq.bi);
      const j = bodies.indexOf(eq.bj);
      const ni = nodes[i];
      const nj = nodes[j];
      ni.children.push(nj);
      ni.eqs.push(eq);
      nj.children.push(ni);
      nj.eqs.push(eq);
    }

    let child;
    let n = 0;
    let eqs = this.SplitSolver_solve_eqs;

    subsolver.tolerance = this.tolerance;
    subsolver.iterations = this.iterations;

    const dummyWorld = this.SplitSolver_solve_dummyWorld;
    while ((child = this.getUnvisitedNode(nodes))) {
      eqs.length = 0;
      dummyWorld.bodies.length = 0;
      this.bfs(child, this.visitFunc, dummyWorld.bodies, eqs);

      const Neqs = eqs.length;

      eqs = eqs.sort(this.sortById);

      for (let i = 0; i !== Neqs; i++) {
        subsolver.addEquation(eqs[i]);
      }

      const iter = subsolver.solve(dt, dummyWorld);
      subsolver.removeAllEquations();
      n++;
    }

    return n;
  }

  getUnvisitedNode(nodes) {
    const Nnodes = nodes.length;
    for (let i = 0; i !== Nnodes; i++) {
      const node = nodes[i];
      if (!node.visited && !(node.body.type & SplitSolver.STATIC)) {
        return node;
      }
    }
    return false;
  }

  bfs(root, visitFunc, bds, eqs) {
    this.queue.push(root);
    root.visited = true;
    visitFunc(root, bds, eqs);
    while (this.queue.length) {
      const node = this.queue.pop();
      // Loop over unvisited child nodes
      let child;
      while ((child = this.getUnvisitedNode(node.children))) {
        child.visited = true;
        visitFunc(child, bds, eqs);
        this.queue.push(child);
      }
    }
  }

  visitFunc(node, bds, eqs) {
    bds.push(node.body);
    const Neqs = node.eqs.length;
    for (let i = 0; i !== Neqs; i++) {
      const eq = node.eqs[i];
      if (!eqs.includes(eq)) {
        eqs.push(eq);
      }
    }
  }

  sortById(a, b) {
    return b._id - a._id;
  }
}
SplitSolver.register("CANNON.SplitSolver");

export { SplitSolver };
