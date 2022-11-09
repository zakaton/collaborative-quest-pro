import { Vec3 } from "../math/Vec3.js";
import { Quaternion } from "../math/Quaternion.js";
import { Transform } from "../math/Transform.js";
import { RaycastResult } from "../collision/RaycastResult.js";
import { Shape } from "../shapes/Shape.js";
import { AABB } from "../collision/AABB.js";

/* global Croquet, ISLAND */

class Ray extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Ray"]) return;

    console.groupCollapsed(`[Ray-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  static get CLOSEST() {
    return 1;
  }
  static get ANY() {
    return 2;
  }
  static get ALL() {
    return 4;
  }

  get [Shape.TYPES.SPHERE]() {
    return this._intersectSphere;
  }
  get [Shape.TYPES.PLANE]() {
    return this._intersectPlane;
  }
  get [Shape.TYPES.BOX]() {
    return this._intersectBox;
  }
  get [Shape.TYPES.CYLINDER]() {
    return this._intersectConvex;
  }
  get [Shape.TYPES.CONVEXPOLYHEDRON]() {
    return this._intersectConvex;
  }
  get [Shape.TYPES.HEIGHTFIELD]() {
    return this._intersectHeightfield;
  }
  get [Shape.TYPES.TRIMESH]() {
    return this._intersectTrimesh;
  }

  init(options = {}) {
    super.init();

    this.from = options.from ? options.from.clone() : new Vec3();
    this.to = options.to ? options.to.clone() : new Vec3();
    this.direction = new Vec3();
    this.precision = 0.0001;
    this.checkCollisionResponse = true;
    this.skipBackfaces = false;
    this.collisionFilterMask = -1;
    this.collisionFilterGroup = -1;
    this.mode = Ray.ANY;
    this.result = RaycastResult.create();
    this.hasHit = false;

    // temp
    this.tmpArray = [];

    this.intersectConvexOptions = {
      faceList: [0]
    };
    this.intersectHeightfield_index = [];
    this.intersectTrimesh_triangles = [];
  }

  static get tmpAABB() {
    const name = "CANNON.Ray.tmpAABB";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new AABB();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get v0() {
    const name = "CANNON.Ray.v0";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get v1() {
    const name = "CANNON.Ray.v1";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get v2() {
    const name = "CANNON.Ray.v2";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectBody_xi() {
    const name = "CANNON.Ray.intersectBody_xi";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectBody_qi() {
    const name = "CANNON.Ray.intersectBody_qi";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = Quaternion.create();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectPoint() {
    const name = "CANNON.Ray.intersectPoint";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get a() {
    const name = "CANNON.Ray.a";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get b() {
    const name = "CANNON.Ray.b";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get c() {
    const name = "CANNON.Ray.c";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get d() {
    const name = "CANNON.Ray.d";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get worldPillarOffset() {
    const name = "CANNON.Ray.worldPillarOffset";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectHeightfield_localRay() {
    const name = "CANNON.Ray.intersectHeightfield_localRay";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = Ray.create();
      temp.beWellKnownAs(name);
    }
    return temp;
  }

  static get Ray_intersectSphere_intersectionPoint() {
    const name = "CANNON.Ray.Ray_intersectSphere_intersectionPoint";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get Ray_intersectSphere_normal() {
    const name = "CANNON.Ray.Ray_intersectSphere_normal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectConvex_normal() {
    const name = "CANNON.Ray.intersectConvex_normal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectConvex_minDistNormal() {
    const name = "CANNON.Ray.intersectConvex_minDistNormal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectConvex_minDistIntersect() {
    const name = "CANNON.Ray.intersectConvex_minDistIntersect";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectConvex_vector() {
    const name = "CANNON.Ray.intersectConvex_vector";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_normal() {
    const name = "CANNON.Ray.intersectTrimesh_normal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_localDirection() {
    const name = "CANNON.Ray.intersectTrimesh_localDirection";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersectTrimesh_localFrom() {
    const name = "CANNON.Ray.intersectTrimesh_localFrom";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_localTo() {
    const name = "CANNON.Ray.intersectTrimesh_localTo";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_worldNormal() {
    const name = "CANNON.Ray.intersectTrimesh_worldNormal";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_worldIntersectPoint() {
    const name = "CANNON.Ray.intersectTrimesh_worldIntersectPoint";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_localAABB() {
    const name = "CANNON.Ray.intersectTrimesh_localAABB";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new AABB();
      ISLAND.set(temp, name);
    }
    return temp;
  }
  static get intersectTrimesh_treeTransform() {
    const name = "CANNON.Ray.intersectTrimesh_treeTransform";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  static get intersect() {
    const name = "CANNON.Ray.intersect";
    let temp = ISLAND.get(name);
    if (!temp) {
      temp = new Vec3();
      ISLAND.set(temp, name);
    }
    return temp;
  }

  /**
   * Do itersection against all bodies in the given World.
   * @method intersectWorld
   * @param  {World} world
   * @param  {object} options
   * @return {Boolean} True if the ray hit anything, otherwise false.
   */
  intersectWorld(world, options) {
    this.mode = options.mode || Ray.ANY;
    this.result = options.result || RaycastResult.create();
    this.skipBackfaces = !!options.skipBackfaces;
    this.collisionFilterMask =
      typeof options.collisionFilterMask !== "undefined"
        ? options.collisionFilterMask
        : -1;
    this.collisionFilterGroup =
      typeof options.collisionFilterGroup !== "undefined"
        ? options.collisionFilterGroup
        : -1;
    this.checkCollisionResponse =
      typeof options.checkCollisionResponse !== "undefined"
        ? options.checkCollisionResponse
        : true;

    if (options.from) {
      this.from.copy(options.from);
    }
    if (options.to) {
      this.to.copy(options.to);
    }

    //this.callback = options.callback || (() => {});
    this.hasHit = false;

    this.result.reset();
    this.updateDirection();

    this.getAABB(Ray.tmpAABB);
    this.tmpArray.length = 0;
    world.broadphase.aabbQuery(world, Ray.tmpAABB, this.tmpArray);
    this.intersectBodies(this.tmpArray);

    return this.hasHit;
  }

  /**
   * Shoot a ray at a body, get back information about the hit.
   * @param {Body} body
   * @param {RaycastResult} [result] Deprecated - set the result property of the Ray instead.
   */
  intersectBody(body, result) {
    if (result) {
      this.result = result;
      this.updateDirection();
    }
    const checkCollisionResponse = this.checkCollisionResponse;

    if (checkCollisionResponse && !body.collisionResponse) {
      return;
    }

    if (
      (this.collisionFilterGroup & body.collisionFilterMask) === 0 ||
      (body.collisionFilterGroup & this.collisionFilterMask) === 0
    ) {
      return;
    }

    const xi = Ray.intersectBody_xi;
    const qi = Ray.intersectBody_qi;

    for (let i = 0, N = body.shapes.length; i < N; i++) {
      const shape = body.shapes[i];

      if (checkCollisionResponse && !shape.collisionResponse) {
        continue; // Skip
      }

      body.quaternion.mult(body.shapeOrientations[i], qi);
      body.quaternion.vmult(body.shapeOffsets[i], xi);
      xi.vadd(body.position, xi);

      this.intersectShape(shape, qi, xi, body);

      if (this.result.shouldStop) {
        break;
      }
    }
  }

  /**
   * @method intersectBodies
   * @param {Array} bodies An array of Body objects.
   * @param {RaycastResult} [result] Deprecated
   */
  intersectBodies(bodies, result) {
    if (result) {
      this.result = result;
      this.updateDirection();
    }

    for (let i = 0, l = bodies.length; !this.result.shouldStop && i < l; i++) {
      this.intersectBody(bodies[i]);
    }
  }

  updateDirection() {
    this.to.vsub(this.from, this.direction);
    this.direction.normalize();
  }

  intersectShape(shape, quat, position, body) {
    const from = this.from;

    // Checking boundingSphere
    const distance = this.distanceFromIntersection(
      from,
      this.direction,
      position
    );
    if (distance > shape.boundingSphereRadius) {
      return;
    }

    const intersectMethod = this[shape.type];
    if (intersectMethod) {
      intersectMethod.call(this, shape, quat, position, body, shape);
    }
  }

  _intersectBox(box, quat, position, body, reportedShape) {
    return this._intersectConvex(
      box.convexPolyhedronRepresentation,
      quat,
      position,
      body,
      reportedShape
    );
  }

  _intersectPlane(shape, quat, position, body, reportedShape) {
    const from = this.from;
    const to = this.to;
    const direction = this.direction;

    // Get plane normal
    const worldNormal = new Vec3(0, 0, 1);
    quat.vmult(worldNormal, worldNormal);

    const len = new Vec3();
    from.vsub(position, len);
    const planeToFrom = len.dot(worldNormal);
    to.vsub(position, len);
    const planeToTo = len.dot(worldNormal);

    if (planeToFrom * planeToTo > 0) {
      // "from" and "to" are on the same side of the plane... bail out
      return;
    }

    if (from.distanceTo(to) < planeToFrom) {
      return;
    }

    const n_dot_dir = worldNormal.dot(direction);

    if (Math.abs(n_dot_dir) < this.precision) {
      // No intersection
      return;
    }

    const planePointToFrom = new Vec3();
    const dir_scaled_with_t = new Vec3();
    const hitPointWorld = new Vec3();

    from.vsub(position, planePointToFrom);
    const t = -worldNormal.dot(planePointToFrom) / n_dot_dir;
    direction.scale(t, dir_scaled_with_t);
    from.vadd(dir_scaled_with_t, hitPointWorld);

    this.reportIntersection(
      worldNormal,
      hitPointWorld,
      reportedShape,
      body,
      -1
    );
  }

  getAABB(aabb) {
    const { lowerBound, upperBound } = aabb;
    const to = this.to;
    const from = this.from;
    lowerBound.x = Math.min(to.x, from.x);
    lowerBound.y = Math.min(to.y, from.y);
    lowerBound.z = Math.min(to.z, from.z);
    upperBound.x = Math.max(to.x, from.x);
    upperBound.y = Math.max(to.y, from.y);
    upperBound.z = Math.max(to.z, from.z);
  }

  _intersectHeightfield(shape, quat, position, body, reportedShape) {
    const data = shape.data;
    const w = shape.elementSize;

    // Convert the ray to local heightfield coordinates
    const localRay = Ray.intersectHeightfield_localRay; //new Ray(this.from, this.to);
    localRay.from.copy(this.from);
    localRay.to.copy(this.to);
    Transform.pointToLocalFrame(position, quat, localRay.from, localRay.from);
    Transform.pointToLocalFrame(position, quat, localRay.to, localRay.to);
    localRay.updateDirection();

    // Get the index of the data points to test against
    const index = this.intersectHeightfield_index;
    let iMinX;
    let iMinY;
    let iMaxX;
    let iMaxY;

    // Set to max
    iMinX = iMinY = 0;
    iMaxX = iMaxY = shape.data.length - 1;

    const aabb = new AABB();
    localRay.getAABB(aabb);

    shape.getIndexOfPosition(aabb.lowerBound.x, aabb.lowerBound.y, index, true);
    iMinX = Math.max(iMinX, index[0]);
    iMinY = Math.max(iMinY, index[1]);
    shape.getIndexOfPosition(aabb.upperBound.x, aabb.upperBound.y, index, true);
    iMaxX = Math.min(iMaxX, index[0] + 1);
    iMaxY = Math.min(iMaxY, index[1] + 1);

    for (let i = iMinX; i < iMaxX; i++) {
      for (let j = iMinY; j < iMaxY; j++) {
        if (this.result.shouldStop) {
          return;
        }

        shape.getAabbAtIndex(i, j, aabb);
        if (!aabb.overlapsRay(localRay)) {
          continue;
        }

        // Lower triangle
        shape.getConvexTrianglePillar(i, j, false);
        Transform.pointToWorldFrame(
          position,
          quat,
          shape.pillarOffset,
          Ray.worldPillarOffset
        );
        this._intersectConvex(
          shape.pillarConvex,
          quat,
          Ray.worldPillarOffset,
          body,
          reportedShape,
          this.intersectConvexOptions
        );

        if (this.result.shouldStop) {
          return;
        }

        // Upper triangle
        shape.getConvexTrianglePillar(i, j, true);
        Transform.pointToWorldFrame(
          position,
          quat,
          shape.pillarOffset,
          Ray.worldPillarOffset
        );
        this._intersectConvex(
          shape.pillarConvex,
          quat,
          Ray.worldPillarOffset,
          body,
          reportedShape,
          this.intersectConvexOptions
        );
      }
    }
  }

  _intersectSphere(sphere, quat, position, body, reportedShape) {
    const from = this.from;
    const to = this.to;
    const r = sphere.radius;

    const a =
      (to.x - from.x) ** 2 + (to.y - from.y) ** 2 + (to.z - from.z) ** 2;
    const b =
      2 *
      ((to.x - from.x) * (from.x - position.x) +
        (to.y - from.y) * (from.y - position.y) +
        (to.z - from.z) * (from.z - position.z));
    const c =
      (from.x - position.x) ** 2 +
      (from.y - position.y) ** 2 +
      (from.z - position.z) ** 2 -
      r ** 2;

    const delta = b ** 2 - 4 * a * c;

    const intersectionPoint = Ray.Ray_intersectSphere_intersectionPoint;
    const normal = Ray.Ray_intersectSphere_normal;

    if (delta < 0) {
      // No intersection
      return;
    } else if (delta === 0) {
      // single intersection point
      from.lerp(to, delta, intersectionPoint);

      intersectionPoint.vsub(position, normal);
      normal.normalize();

      this.reportIntersection(
        normal,
        intersectionPoint,
        reportedShape,
        body,
        -1
      );
    } else {
      const d1 = (-b - Math.sqrt(delta)) / (2 * a);
      const d2 = (-b + Math.sqrt(delta)) / (2 * a);

      if (d1 >= 0 && d1 <= 1) {
        from.lerp(to, d1, intersectionPoint);
        intersectionPoint.vsub(position, normal);
        normal.normalize();
        this.reportIntersection(
          normal,
          intersectionPoint,
          reportedShape,
          body,
          -1
        );
      }

      if (this.result.shouldStop) {
        return;
      }

      if (d2 >= 0 && d2 <= 1) {
        from.lerp(to, d2, intersectionPoint);
        intersectionPoint.vsub(position, normal);
        normal.normalize();
        this.reportIntersection(
          normal,
          intersectionPoint,
          reportedShape,
          body,
          -1
        );
      }
    }
  }

  _intersectConvex(shape, quat, position, body, reportedShape, options) {
    const minDistNormal = this.intersectConvex_minDistNormal;
    const normal = Ray.intersectConvex_normal;
    const vector = Ray.intersectConvex_vector;
    const minDistIntersect = this.intersectConvex_minDistIntersect;
    const faceList = (options && options.faceList) || null;
    // Checking faces
    const faces = shape.faces;

    const vertices = shape.vertices;
    const normals = shape.faceNormals;
    const direction = this.direction;

    const from = this.from;
    const to = this.to;
    const fromToDistance = from.distanceTo(to);

    const minDist = -1;
    const Nfaces = faceList ? faceList.length : faces.length;
    const result = this.result;

    for (let j = 0; !result.shouldStop && j < Nfaces; j++) {
      const fi = faceList ? faceList[j] : j;

      const face = faces[fi];
      const faceNormal = normals[fi];
      const q = quat;
      const x = position;

      // determine if ray intersects the plane of the face
      // note: this works regardless of the direction of the face normal

      // Get plane point in world coordinates...
      vector.copy(vertices[face[0]]);
      q.vmult(vector, vector);
      vector.vadd(x, vector);

      // ...but make it relative to the ray from. We'll fix this later.
      vector.vsub(from, vector);

      // Get plane normal
      q.vmult(faceNormal, normal);

      // If this dot product is negative, we have something interesting
      const dot = direction.dot(normal);

      // Bail out if ray and plane are parallel
      if (Math.abs(dot) < this.precision) {
        continue;
      }

      // calc distance to plane
      const scalar = normal.dot(vector) / dot;

      // if negative distance, then plane is behind ray
      if (scalar < 0) {
        continue;
      }

      // if (dot < 0) {

      // Intersection point is from + direction * scalar
      direction.scale(scalar, Ray.intersectPoint);
      Ray.intersectPoint.vadd(from, Ray.intersectPoint);

      // a is the point we compare points b and c with.
      Ray.a.copy(vertices[face[0]]);
      q.vmult(Ray.a, Ray.a);
      x.vadd(Ray.a, Ray.a);

      for (let i = 1; !result.shouldStop && i < face.length - 1; i++) {
        // Transform 3 vertices to world coords
        Ray.b.copy(vertices[face[i]]);
        Ray.c.copy(vertices[face[i + 1]]);
        q.vmult(Ray.b, Ray.b);
        q.vmult(Ray.c, Ray.c);
        x.vadd(Ray.b, Ray.b);
        x.vadd(Ray.c, Ray.c);

        const distance = Ray.intersectPoint.distanceTo(from);

        if (
          !(
            this.pointInTriangle(Ray.intersectPoint, Ray.a, Ray.b, Ray.c) ||
            this.pointInTriangle(Ray.intersectPoint, Ray.b, Ray.a, Ray.c)
          ) ||
          distance > fromToDistance
        ) {
          continue;
        }

        this.reportIntersection(
          normal,
          Ray.intersectPoint,
          reportedShape,
          body,
          fi
        );
      }
      // }
    }
  }

  /**
   * @todo Optimize by transforming the world to local space first.
   * @todo Use Octree lookup
   */
  _intersectTrimesh(mesh, quat, position, body, reportedShape, options) {
    const normal = Ray.intersectTrimesh_normal;
    const triangles = this.intersectTrimesh_triangles;
    const treeTransform = Ray.intersectTrimesh_treeTransform;
    const minDistNormal = this.intersectConvex_minDistNormal;
    const vector = Ray.intersectConvex_vector;
    const minDistIntersect = this.intersectConvex_minDistIntersect;
    const localAABB = Ray.intersectTrimesh_localAABB;
    const localDirection = Ray.intersectTrimesh_localDirection;
    const localFrom = Ray.intersectTrimesh_localFrom;
    const localTo = Ray.intersectTrimesh_localTo;
    const worldIntersectPoint = Ray.intersectTrimesh_worldIntersectPoint;
    const worldNormal = Ray.intersectTrimesh_worldNormal;
    const faceList = (options && options.faceList) || null;

    // Checking faces
    const indices = mesh.indices;

    const vertices = mesh.vertices;
    // const normals = mesh.faceNormals

    const from = this.from;
    const to = this.to;
    const direction = this.direction;

    const minDist = -1;
    treeTransform.position.copy(position);
    treeTransform.quaternion.copy(quat);

    // Transform ray to local space!
    Transform.vectorToLocalFrame(position, quat, direction, localDirection);
    Transform.pointToLocalFrame(position, quat, from, localFrom);
    Transform.pointToLocalFrame(position, quat, to, localTo);

    localTo.x *= mesh.scale.x;
    localTo.y *= mesh.scale.y;
    localTo.z *= mesh.scale.z;
    localFrom.x *= mesh.scale.x;
    localFrom.y *= mesh.scale.y;
    localFrom.z *= mesh.scale.z;

    localTo.vsub(localFrom, localDirection);
    localDirection.normalize();

    const fromToDistanceSquared = localFrom.distanceSquared(localTo);

    mesh.tree.rayQuery(this, treeTransform, triangles);

    for (
      let i = 0, N = triangles.length;
      !this.result.shouldStop && i !== N;
      i++
    ) {
      const trianglesIndex = triangles[i];

      mesh.getNormal(trianglesIndex, normal);

      // determine if ray intersects the plane of the face
      // note: this works regardless of the direction of the face normal

      // Get plane point in world coordinates...
      mesh.getVertex(indices[trianglesIndex * 3], Ray.a);

      // ...but make it relative to the ray from. We'll fix this later.
      Ray.a.vsub(localFrom, vector);

      // If this dot product is negative, we have something interesting
      const dot = localDirection.dot(normal);

      // Bail out if ray and plane are parallel
      // if (Math.abs( dot ) < this.precision){
      //     continue;
      // }

      // calc distance to plane
      const scalar = normal.dot(vector) / dot;

      // if negative distance, then plane is behind ray
      if (scalar < 0) {
        continue;
      }

      // Intersection point is from + direction * scalar
      localDirection.scale(scalar, Ray.intersectPoint);
      Ray.intersectPoint.vadd(localFrom, Ray.intersectPoint);

      // Get triangle vertices
      mesh.getVertex(indices[trianglesIndex * 3 + 1], Ray.b);
      mesh.getVertex(indices[trianglesIndex * 3 + 2], Ray.c);

      const squaredDistance = Ray.intersectPoint.distanceSquared(localFrom);

      if (
        !(
          this.pointInTriangle(Ray.intersectPoint, Ray.b, Ray.a, Ray.c) ||
          this.pointInTriangle(Ray.intersectPoint, Ray.a, Ray.b, Ray.c)
        ) ||
        squaredDistance > fromToDistanceSquared
      ) {
        continue;
      }

      // transform intersectpoint and normal to world
      Transform.vectorToWorldFrame(quat, normal, worldNormal);
      Transform.pointToWorldFrame(
        position,
        quat,
        Ray.intersectPoint,
        worldIntersectPoint
      );
      this.reportIntersection(
        worldNormal,
        worldIntersectPoint,
        reportedShape,
        body,
        trianglesIndex
      );
    }
    triangles.length = 0;
  }

  reportIntersection(normal, hitPointWorld, shape, body, hitFaceIndex) {
    const from = this.from;
    const to = this.to;
    const distance = from.distanceTo(hitPointWorld);
    const result = this.result;

    // Skip back faces?
    if (this.skipBackfaces && normal.dot(this.direction) > 0) {
      return;
    }

    result.hitFaceIndex =
      typeof hitFaceIndex !== "undefined" ? hitFaceIndex : -1;

    switch (this.mode) {
      case Ray.ALL:
        this.hasHit = true;
        result.set(from, to, normal, hitPointWorld, shape, body, distance);
        result.hasHit = true;
        //this.callback(result);
        break;

      case Ray.CLOSEST:
        // Store if closer than current closest
        if (distance < result.distance || !result.hasHit) {
          this.hasHit = true;
          result.hasHit = true;
          result.set(from, to, normal, hitPointWorld, shape, body, distance);
        }
        break;

      case Ray.ANY:
        // Report and stop.
        this.hasHit = true;
        result.hasHit = true;
        result.set(from, to, normal, hitPointWorld, shape, body, distance);
        result.shouldStop = true;
        break;
    }
  }

  pointInTriangle(p, a, b, c) {
    c.vsub(a, Ray.v0);
    b.vsub(a, Ray.v1);
    p.vsub(a, Ray.v2);

    const dot00 = Ray.v0.dot(Ray.v0);
    const dot01 = Ray.v0.dot(Ray.v1);
    const dot02 = Ray.v0.dot(Ray.v2);
    const dot11 = Ray.v1.dot(Ray.v1);
    const dot12 = Ray.v1.dot(Ray.v2);

    let u;
    let v;

    return (
      (u = dot11 * dot02 - dot01 * dot12) >= 0 &&
      (v = dot00 * dot12 - dot01 * dot02) >= 0 &&
      u + v < dot00 * dot11 - dot01 * dot01
    );
  }

  distanceFromIntersection(from, direction, position) {
    // v0 is vector from from to position
    position.vsub(from, Ray.v0);
    const dot = Ray.v0.dot(direction);

    // intersect = direction*dot + from
    direction.scale(dot, Ray.intersect);
    Ray.intersect.vadd(from, Ray.intersect);

    const distance = position.distanceTo(Ray.intersect);

    return distance;
  }

  destroy() {
    this.from.destroy();
    this.to.destroy();

    this.direction.destroy();
    this.result.destroy();

    // temp
    this.tmpArray.length = 0;
  }
}
Ray.register("CANNON.Ray");

export { Ray };
