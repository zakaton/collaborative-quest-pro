import { Vec3 } from "../math/Vec3.js";

/* global Croquet, ISLAND */

class SPHSystem extends Croquet.Model {
  init() {
    super.init();

    this.particles = [];
    this.density = 1;
    this.smoothingRadius = 1;
    this.speedOfSound = 1;
    this.viscosity = 0.01;
    this.eps = 0.000001;

    // Stuff Computed per particle
    this.pressures = [];
    this.densities = [];
    this.neighbors = [];
  }
  
  static get SPHSystem_getNeighbors_dist() {
    const name = "CANNON.SPHSystem.SPHSystem_getNeighbors_dist"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  
  static get SPHSystem_update_dist() {
    const name = "CANNON.SPHSystem.SPHSystem_update_dist"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  
  static get SPHSystem_update_a_pressure() {
    const name = "CANNON.SPHSystem.SPHSystem_update_a_pressure"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  static get SPHSystem_update_a_visc() {
    const name = "CANNON.SPHSystem.SPHSystem_update_a_visc"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  static get SPHSystem_update_gradW() {
    const name = "CANNON.SPHSystem.SPHSystem_update_gradW"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  static get SPHSystem_update_r_vec() {
    const name = "CANNON.SPHSystem.SPHSystem_update_r_vec"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }
  static get SPHSystem_update_u() {
    const name = "CANNON.SPHSystem.SPHSystem_update_u"
    let temp = ISLAND.get(name);
    if (!temp) {
        temp = new Vec3();
        temp.beWellKnownAs(name)
    }
    return temp;
  }

  /**
   * Add a particle to the system.
   * @method add
   * @param {Body} particle
   */
  add(particle) {
    this.particles.push(particle);
    if (this.neighbors.length < this.particles.length) {
      this.neighbors.push([]);
    }
  }

  /**
   * Remove a particle from the system.
   * @method remove
   * @param {Body} particle
   */
  remove(particle) {
    const idx = this.particles.indexOf(particle);
    if (idx !== -1) {
      this.particles.splice(idx, 1);
      if (this.neighbors.length > this.particles.length) {
        this.neighbors.pop();
      }
    }
  }

  getNeighbors(particle, neighbors) {
    const N = this.particles.length;
    const id = particle.id;
    const R2 = this.smoothingRadius * this.smoothingRadius;
    const dist = SPHSystem.SPHSystem_getNeighbors_dist;
    for (let i = 0; i !== N; i++) {
      const p = this.particles[i];
      p.position.vsub(particle.position, dist);
      if (id !== p.id && dist.lengthSquared() < R2) {
        neighbors.push(p);
      }
    }
  }

  update() {
    const N = this.particles.length;
    const dist = SPHSystem.SPHSystem_update_dist;
    const cs = this.speedOfSound;
    const eps = this.eps;

    for (let i = 0; i !== N; i++) {
      const p = this.particles[i]; // Current particle
      const neighbors = this.neighbors[i];

      // Get neighbors
      neighbors.length = 0;
      this.getNeighbors(p, neighbors);
      neighbors.push(this.particles[i]); // Add current too
      const numNeighbors = neighbors.length;

      // Accumulate density for the particle
      let sum = 0.0;
      for (let j = 0; j !== numNeighbors; j++) {
        //printf("Current particle has position %f %f %f\n",objects[id].pos.x(),objects[id].pos.y(),objects[id].pos.z());
        p.position.vsub(neighbors[j].position, dist);
        const len = dist.length();

        const weight = this.w(len);
        sum += neighbors[j].mass * weight;
      }

      // Save
      this.densities[i] = sum;
      this.pressures[i] = cs * cs * (this.densities[i] - this.density);
    }

    // Add forces

    // Sum to these accelerations
    const a_pressure = SPHSystem.SPHSystem_update_a_pressure;
    const a_visc = SPHSystem.SPHSystem_update_a_visc;
    const gradW = SPHSystem.SPHSystem_update_gradW;
    const r_vec = SPHSystem.SPHSystem_update_r_vec;
    const u = SPHSystem.SPHSystem_update_u;

    for (let i = 0; i !== N; i++) {
      const particle = this.particles[i];

      a_pressure.set(0, 0, 0);
      a_visc.set(0, 0, 0);

      // Init vars
      let Pij;
      let nabla;
      let Vij;

      // Sum up for all other neighbors
      const neighbors = this.neighbors[i];
      const numNeighbors = neighbors.length;

      //printf("Neighbors: ");
      for (let j = 0; j !== numNeighbors; j++) {
        const neighbor = neighbors[j];
        //printf("%d ",nj);

        // Get r once for all..
        particle.position.vsub(neighbor.position, r_vec);
        const r = r_vec.length();

        // Pressure contribution
        Pij =
          -neighbor.mass *
          (this.pressures[i] / (this.densities[i] * this.densities[i] + eps) +
            this.pressures[j] / (this.densities[j] * this.densities[j] + eps));
        this.gradw(r_vec, gradW);
        // Add to pressure acceleration
        gradW.scale(Pij, gradW);
        a_pressure.vadd(gradW, a_pressure);

        // Viscosity contribution
        neighbor.velocity.vsub(particle.velocity, u);
        u.scale(
          (1.0 / (0.0001 + this.densities[i] * this.densities[j])) *
            this.viscosity *
            neighbor.mass,
          u
        );
        nabla = this.nablaw(r);
        u.scale(nabla, u);
        // Add to viscosity acceleration
        a_visc.vadd(u, a_visc);
      }

      // Calculate force
      a_visc.scale(particle.mass, a_visc);
      a_pressure.scale(particle.mass, a_pressure);

      // Add force to particles
      particle.force.vadd(a_visc, particle.force);
      particle.force.vadd(a_pressure, particle.force);
    }
  }

  // Calculate the weight using the W(r) weightfunction
  w(r) {
    // 315
    const h = this.smoothingRadius;
    return (315.0 / (64.0 * Math.PI * h ** 9)) * (h * h - r * r) ** 3;
  }

  // calculate gradient of the weight function
  gradw(rVec, resultVec) {
    const r = rVec.length();
    const h = this.smoothingRadius;
    rVec.scale(
      (945.0 / (32.0 * Math.PI * h ** 9)) * (h * h - r * r) ** 2,
      resultVec
    );
  }

  // Calculate nabla(W)
  nablaw(r) {
    const h = this.smoothingRadius;
    const nabla =
      (945.0 / (32.0 * Math.PI * h ** 9)) *
      (h * h - r * r) *
      (7 * r * r - 3 * h * h);
    return nabla;
  }
}
SPHSystem.register("CANNON.SPHSystem");

export { SPHSystem };
