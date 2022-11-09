import { Shape } from "../shapes/Shape.js";
import { Vec3 } from "../math/Vec3.js";
import { Transform } from "../math/Transform.js";
import { AABB } from "../collision/AABB.js";
import { Octree } from "../utils/Octree.js";

/* global Croquet, ISLAND */

class Trimesh extends Shape {
  init(options = {}) {
    super.init({ type: Shape.TYPES.TRIMESH });

    const { vertices, indices } = options;

    this.vertices = new Float32Array(vertices);
    this.indices = new Int16Array(indices);
    this.normals = new Float32Array(indices.length);
    this.aabb = AABB.create();
    this.edges = null;
    this.scale = new Vec3(1, 1, 1);
    this.tree = new Octree();

    this.updateEdges();
    this.updateNormals();
    this.updateAABB();
    this.updateBoundingSphereRadius();
    this.updateTree();
  }

  static get computeNormals_n() {
    const name = "CANNON.Trimesh.computeNormals_n";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get unscaledAABB() {
    const name = "CANNON.Trimesh.unscaledAABB";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = AABB.create();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get getEdgeVector_va() {
    const name = "CANNON.Trimesh.getEdgeVector_va";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get getEdgeVector_vb() {
    const name = "CANNON.Trimesh.getEdgeVector_vb";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get cb() {
    const name = "CANNON.Trimesh.cb";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get ab() {
    const name = "CANNON.Trimesh.ab";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get va() {
    const name = "CANNON.Trimesh.va";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get vb() {
    const name = "CANNON.Trimesh.vb";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get vc() {
    const name = "CANNON.Trimesh.vc";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get cli_aabb() {
    const name = "CANNON.Trimesh.cli_aabb";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = AABB.create();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get computeLocalAABB_worldVert() {
    const name = "CANNON.Trimesh.computeLocalAABB_worldVert";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get calculateWorldAABB_frame() {
    const name = "CANNON.Trimesh.calculateWorldAABB_frame";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = Transform.create();
      temp.beWellKnownAs(name);
    }
    return temp;
  }
  static get calculateWorldAABB_aabb() {
    const name = "CANNON.Trimesh.calculateWorldAABB_aabb";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = AABB.create();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  /**
   * @method updateTree
   */
  updateTree() {
    const tree = this.tree;

    tree.reset();
    tree.aabb.copy(this.aabb);
    const scale = this.scale; // The local mesh AABB is scaled, but the octree AABB should be unscaled
    tree.aabb.lowerBound.x *= 1 / scale.x;
    tree.aabb.lowerBound.y *= 1 / scale.y;
    tree.aabb.lowerBound.z *= 1 / scale.z;
    tree.aabb.upperBound.x *= 1 / scale.x;
    tree.aabb.upperBound.y *= 1 / scale.y;
    tree.aabb.upperBound.z *= 1 / scale.z;

    // Insert all triangles
    const triangleAABB = new AABB();
    const a = new Vec3();
    const b = new Vec3();
    const c = new Vec3();
    const points = [a, b, c];
    for (let i = 0; i < this.indices.length / 3; i++) {
      //this.getTriangleVertices(i, a, b, c);

      // Get unscaled triangle verts
      const i3 = i * 3;
      this._getUnscaledVertex(this.indices[i3], a);
      this._getUnscaledVertex(this.indices[i3 + 1], b);
      this._getUnscaledVertex(this.indices[i3 + 2], c);

      triangleAABB.setFromPoints(points);
      tree.insert(triangleAABB, i);
    }
    tree.removeEmptyNodes();
  }

  /**
   * Get triangles in a local AABB from the trimesh.
   * @method getTrianglesInAABB
   * @param  {AABB} aabb
   * @param  {array} result An array of integers, referencing the queried triangles.
   */
  getTrianglesInAABB(aabb, result) {
    const unscaledAABB = Trimesh.unscaledAABB;
    unscaledAABB.copy(aabb);

    // Scale it to local
    const scale = this.scale;
    const isx = scale.x;
    const isy = scale.y;
    const isz = scale.z;
    const l = unscaledAABB.lowerBound;
    const u = unscaledAABB.upperBound;
    l.x /= isx;
    l.y /= isy;
    l.z /= isz;
    u.x /= isx;
    u.y /= isy;
    u.z /= isz;

    return this.tree.aabbQuery(unscaledAABB, result);
  }

  /**
   * @method setScale
   * @param {Vec3} scale
   */
  setScale(scale) {
    const wasUniform =
      this.scale.x === this.scale.y && this.scale.y === this.scale.z;
    const isUniform = scale.x === scale.y && scale.y === scale.z;

    if (!(wasUniform && isUniform)) {
      // Non-uniform scaling. Need to update normals.
      this.updateNormals();
    }
    this.scale.copy(scale);
    this.updateAABB();
    this.updateBoundingSphereRadius();
  }

  /**
   * Compute the normals of the faces. Will save in the .normals array.
   * @method updateNormals
   */
  updateNormals() {
    const n = Trimesh.computeNormals_n;

    // Generate normals
    const normals = this.normals;
    for (let i = 0; i < this.indices.length / 3; i++) {
      const i3 = i * 3;

      const a = this.indices[i3];
      const b = this.indices[i3 + 1];
      const c = this.indices[i3 + 2];

      this.getVertex(a, Trimesh.va);
      this.getVertex(b, Trimesh.vb);
      this.getVertex(c, Trimesh.vc);

      Trimesh.computeNormal(Trimesh.vb, Trimesh.va, Trimesh.vc, n);

      normals[i3] = n.x;
      normals[i3 + 1] = n.y;
      normals[i3 + 2] = n.z;
    }
  }

  /**
   * Update the .edges property
   * @method updateEdges
   */
  updateEdges() {
    const edges = {};
    const add = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edges[key] = true;
    };
    for (let i = 0; i < this.indices.length / 3; i++) {
      const i3 = i * 3;
      const a = this.indices[i3];
      const b = this.indices[i3 + 1];
      const c = this.indices[i3 + 2];
      add(a, b);
      add(b, c);
      add(c, a);
    }
    const keys = Object.keys(edges);
    this.edges = new Int16Array(keys.length * 2);
    for (let i = 0; i < keys.length; i++) {
      const indices = keys[i].split("_");
      this.edges[2 * i] = parseInt(indices[0], 10);
      this.edges[2 * i + 1] = parseInt(indices[1], 10);
    }
  }

  /**
   * Get an edge vertex
   * @method getEdgeVertex
   * @param  {number} edgeIndex
   * @param  {number} firstOrSecond 0 or 1, depending on which one of the vertices you need.
   * @param  {Vec3} vertexStore Where to store the result
   */
  getEdgeVertex(edgeIndex, firstOrSecond, vertexStore) {
    const vertexIndex = this.edges[edgeIndex * 2 + (firstOrSecond ? 1 : 0)];
    this.getVertex(vertexIndex, vertexStore);
  }

  /**
   * Get a vector along an edge.
   * @method getEdgeVector
   * @param  {number} edgeIndex
   * @param  {Vec3} vectorStore
   */
  getEdgeVector(edgeIndex, vectorStore) {
    Trimesh.va = Trimesh.getEdgeVector_va;
    Trimesh.vb = Trimesh.getEdgeVector_vb;
    this.getEdgeVertex(edgeIndex, 0, Trimesh.va);
    this.getEdgeVertex(edgeIndex, 1, Trimesh.vb);
    Trimesh.vb.vsub(Trimesh.va, vectorStore);
  }

  /**
   * Get face normal given 3 vertices
   * @static
   * @method computeNormal
   * @param {Vec3} this.va
   * @param {Vec3} this.vb
   * @param {Vec3} this.vc
   * @param {Vec3} target
   */
  static computeNormal(va, vb, vc, target) {
    vb.vsub(va, Trimesh.ab);
    vc.vsub(vb, Trimesh.cb);
    Trimesh.cb.cross(Trimesh.ab, target);
    if (!target.isZero()) {
      target.normalize();
    }
  }

  /**
   * Get vertex i.
   * @method getVertex
   * @param  {number} i
   * @param  {Vec3} out
   * @return {Vec3} The "out" vector object
   */
  getVertex(i, out) {
    const scale = this.scale;
    this._getUnscaledVertex(i, out);
    out.x *= scale.x;
    out.y *= scale.y;
    out.z *= scale.z;
    return out;
  }

  /**
   * Get raw vertex i
   * @private
   * @method _getUnscaledVertex
   * @param  {number} i
   * @param  {Vec3} out
   * @return {Vec3} The "out" vector object
   */
  _getUnscaledVertex(i, out) {
    const i3 = i * 3;
    const vertices = this.vertices;
    return out.set(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);
  }

  /**
   * Get a vertex from the trimesh,transformed by the given position and quaternion.
   * @method getWorldVertex
   * @param  {number} i
   * @param  {Vec3} pos
   * @param  {Quaternion} quat
   * @param  {Vec3} out
   * @return {Vec3} The "out" vector object
   */
  getWorldVertex(i, pos, quat, out) {
    this.getVertex(i, out);
    Transform.pointToWorldFrame(pos, quat, out, out);
    return out;
  }

  /**
   * Get the three vertices for triangle i.
   * @method getTriangleVertices
   * @param  {number} i
   * @param  {Vec3} a
   * @param  {Vec3} b
   * @param  {Vec3} c
   */
  getTriangleVertices(i, a, b, c) {
    const i3 = i * 3;
    this.getVertex(this.indices[i3], a);
    this.getVertex(this.indices[i3 + 1], b);
    this.getVertex(this.indices[i3 + 2], c);
  }

  /**
   * Compute the normal of triangle i.
   * @method getNormal
   * @param  {Number} i
   * @param  {Vec3} target
   * @return {Vec3} The "target" vector object
   */
  getNormal(i, target) {
    const i3 = i * 3;
    return target.set(
      this.normals[i3],
      this.normals[i3 + 1],
      this.normals[i3 + 2]
    );
  }

  /**
   * @method calculateLocalInertia
   * @param  {Number} mass
   * @param  {Vec3} target
   * @return {Vec3} The "target" vector object
   */
  calculateLocalInertia(mass, target) {
    const cli_aabb = Trimesh.cli_aabb;
    // Approximate with box inertia
    // Exact inertia calculation is overkill, but see http://geometrictools.com/Documentation/PolyhedralMassProperties.pdf for the correct way to do it
    this.computeLocalAABB(cli_aabb);
    const x = cli_aabb.upperBound.x - cli_aabb.lowerBound.x;
    const y = cli_aabb.upperBound.y - cli_aabb.lowerBound.y;
    const z = cli_aabb.upperBound.z - cli_aabb.lowerBound.z;
    return target.set(
      (1.0 / 12.0) * mass * (2 * y * 2 * y + 2 * z * 2 * z),
      (1.0 / 12.0) * mass * (2 * x * 2 * x + 2 * z * 2 * z),
      (1.0 / 12.0) * mass * (2 * y * 2 * y + 2 * x * 2 * x)
    );
  }

  /**
   * Compute the local AABB for the trimesh
   * @method computeLocalAABB
   * @param  {AABB} aabb
   */
  computeLocalAABB(aabb) {
    const l = aabb.lowerBound;
    const u = aabb.upperBound;
    const n = this.vertices.length;
    const vertices = this.vertices;
    const v = Trimesh.computeLocalAABB_worldVert;

    this.getVertex(0, v);
    l.copy(v);
    u.copy(v);

    for (let i = 0; i !== n; i++) {
      this.getVertex(i, v);

      if (v.x < l.x) {
        l.x = v.x;
      } else if (v.x > u.x) {
        u.x = v.x;
      }

      if (v.y < l.y) {
        l.y = v.y;
      } else if (v.y > u.y) {
        u.y = v.y;
      }

      if (v.z < l.z) {
        l.z = v.z;
      } else if (v.z > u.z) {
        u.z = v.z;
      }
    }
  }

  /**
   * Update the .aabb property
   * @method updateAABB
   */
  updateAABB() {
    this.computeLocalAABB(this.aabb);
  }

  /**
   * Will update the .boundingSphereRadius property
   * @method updateBoundingSphereRadius
   */
  updateBoundingSphereRadius() {
    // Assume points are distributed with local (0,0,0) as center
    let max2 = 0;
    const vertices = this.vertices;
    const v = new Vec3();
    for (let i = 0, N = vertices.length / 3; i !== N; i++) {
      this.getVertex(i, v);
      const norm2 = v.lengthSquared();
      if (norm2 > max2) {
        max2 = norm2;
      }
    }
    this.boundingSphereRadius = Math.sqrt(max2);
  }

  /**
   * @method calculateWorldAABB
   * @param {Vec3}        pos
   * @param {Quaternion}  quat
   * @param {Vec3}        min
   * @param {Vec3}        max
   */
  calculateWorldAABB(pos, quat, min, max) {
    /*
        const n = this.vertices.length / 3,
            verts = this.vertices;
        const minx,miny,minz,maxx,maxy,maxz;

        const v = tempWorldVertex;
        for(let i=0; i<n; i++){
            this.getVertex(i, v);
            quat.vmult(v, v);
            pos.vadd(v, v);
            if (v.x < minx || minx===undefined){
                minx = v.x;
            } else if(v.x > maxx || maxx===undefined){
                maxx = v.x;
            }

            if (v.y < miny || miny===undefined){
                miny = v.y;
            } else if(v.y > maxy || maxy===undefined){
                maxy = v.y;
            }

            if (v.z < minz || minz===undefined){
                minz = v.z;
            } else if(v.z > maxz || maxz===undefined){
                maxz = v.z;
            }
        }
        min.set(minx,miny,minz);
        max.set(maxx,maxy,maxz);
        */

    // Faster approximation using local AABB
    const frame = Trimesh.calculateWorldAABB_frame;
    const result = Trimesh.calculateWorldAABB_aabb;
    frame.position = pos;
    frame.quaternion = quat;
    this.aabb.toWorldFrame(frame, result);
    min.copy(result.lowerBound);
    max.copy(result.upperBound);
  }

  /**
   * Get approximate volume
   * @method volume
   * @return {Number}
   */
  volume() {
    return (4.0 * Math.PI * this.boundingSphereRadius) / 3.0;
  }

  /**
   * Create a Trimesh instance, shaped as a torus.
   * @static
   * @method createTorus
   * @param  {number} [radius=1]
   * @param  {number} [tube=0.5]
   * @param  {number} [radialSegments=8]
   * @param  {number} [tubularSegments=6]
   * @param  {number} [arc=6.283185307179586]
   * @return {Trimesh} A torus
   */
  static createTorus(
    radius = 1,
    tube = 0.5,
    radialSegments = 8,
    tubularSegments = 6,
    arc = Math.PI * 2
  ) {
    const vertices = [];
    const indices = [];

    for (let j = 0; j <= radialSegments; j++) {
      for (let i = 0; i <= tubularSegments; i++) {
        const u = (i / tubularSegments) * arc;
        const v = (j / radialSegments) * Math.PI * 2;

        const x = (radius + tube * Math.cos(v)) * Math.cos(u);
        const y = (radius + tube * Math.cos(v)) * Math.sin(u);
        const z = tube * Math.sin(v);

        vertices.push(x, y, z);
      }
    }

    for (let j = 1; j <= radialSegments; j++) {
      for (let i = 1; i <= tubularSegments; i++) {
        const a = (tubularSegments + 1) * j + i - 1;
        const b = (tubularSegments + 1) * (j - 1) + i - 1;
        const c = (tubularSegments + 1) * (j - 1) + i;
        const d = (tubularSegments + 1) * j + i;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return new Trimesh(vertices, indices);
  }
}
Trimesh.register("CANNON.Trimesh");

export { Trimesh };
