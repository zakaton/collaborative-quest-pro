import { ConvexPolyhedron } from "../shapes/ConvexPolyhedron.js";
import { Vec3 } from "../math/Vec3.js";
import { Shape } from "./Shape.js";

/* global Croquet */

class Cylinder extends ConvexPolyhedron {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.Cylinder"]) return;

    console.groupCollapsed(`[Cylinder-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }
  init(options = {}) {
    const radiusTop = "radiusTop" in options ? options.radiusTop : 1;
    const radiusBottom = "radiusBottom" in options ? options.radiusBottom : 1;

    const height = "height" in options ? options.height : 1;
    const numSegments = "numSegments" in options ? options.numSegments : 8;
    
    if (radiusTop < 0) {
      throw new Error("The cylinder radiusTop cannot be negative.");
    }

    if (radiusBottom < 0) {
      throw new Error("The cylinder radiusBottom cannot be negative.");
    }

    const N = numSegments;
    const vertices = [];
    const axes = [];
    const faces = [];
    const bottomface = [];
    const topface = [];
    const cos = Math.cos;
    const sin = Math.sin;

    // First bottom point
    vertices.push(
      new Vec3(-radiusBottom * sin(0), -height * 0.5, radiusBottom * cos(0))
    );
    bottomface.push(0);

    // First top point
    vertices.push(
      new Vec3(
        -radiusTop * sin(0),
        height * 0.5,
        radiusTop * cos(0)
      )
    );
    topface.push(1);

    for (let i = 0; i < N; i++) {
      const theta = ((2 * Math.PI) / N) * (i + 1);
      const thetaN = ((2 * Math.PI) / N) * (i + 0.5);
      if (i < N - 1) {
        // Bottom
        vertices.push(
          new Vec3(
            -radiusBottom * sin(theta),
            -height * 0.5,
            radiusBottom * cos(theta)
          )
        );
        bottomface.push(2 * i + 2);
        // Top
        vertices.push(
          new Vec3(
            -radiusTop * sin(theta),
            height * 0.5,
            radiusTop * cos(theta)
          )
        );
        topface.push(2 * i + 3);

        // Face
        faces.push([2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2]);
      } else {
        faces.push([2 * i, 2 * i + 1, 1, 0]); // Connect
      }

      // Axis: we can cut off half of them if we have even number of segments
      if (N % 2 === 1 || i < N / 2) {
        axes.push(
          new Vec3(
            -sin(thetaN),
            0,
            cos(thetaN)
          )
        );
      }
    }
    faces.push(bottomface);
    axes.push(
      new Vec3(
        0,
        1,
        0
      )
    );

    // Reorder top face
    const temp = [];
    for (let i = 0; i < topface.length; i++) {
      temp.push(topface[topface.length - i - 1]);
    }
    faces.push(temp);

    super.init({ vertices, faces, axes, type: Shape.TYPES.CYLINDER });

    //this.type = Shape.TYPES.CYLINDER
    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.height = height;
    this.numSegments = numSegments;
  }
}
Cylinder.register("CANNON.Cylinder");

export { Cylinder };
