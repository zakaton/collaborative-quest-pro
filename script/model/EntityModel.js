/* global Croquet, AFRAME, THREE, CANNON, Q */

import * as CANNON from "../cannon/CANNON.js";

class EntityModel extends Croquet.Model {
  init({ creatorUserViewId, name, parentName, tagName, components }) {
    super.init();

    // https://croquet.studio/sdk/docs/Model.html#wellKnownModel
    this.physics = this.wellKnownModel("Physics");

    this.name = name;
    this.parentName = parentName;
    this.tagName = tagName;

    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.euler = new THREE.Euler();
    this.matrix = new THREE.Matrix4();

    this.creatorUserViewId = creatorUserViewId;

    this.lastTimeComponentsWereSet = this.now();
    this.lastTimeComponentsWereSetByUser = {}; // {userViewId: timestamp}
    this.lastTimePhysicsBodyWasSet = this.now();
    this.subscribe(this.id, "set-components", this.setComponents);
    this.subscribe(this.sessionId, "view-exit", this.onViewExit);

    this.components = {};
    this.setComponents({
      componentDifferences: components,
      userViewId: creatorUserViewId,
    });
  }

  log(string, ...etc) {
    if (!Q.LOGGING.EntityModel) return;

    console.groupCollapsed(`[EntityModel-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  static types() {
    return {
      "THREE.Vector3": THREE.Vector3,
      "THREE.Quaternion": THREE.Quaternion,
      "THREE.Euler": THREE.Euler,
      "THREE.Matrix4": THREE.Matrix4,
    };
  }

  get isPhysicsEnabled() {
    return (
      (this.components.croquet && this.components.croquet.physics) || false
    );
  }

  get mass() {
    return (this.components.croquet && this.components.croquet.mass) || 0;
  }

  get radius() {
    return (this.components.geometry && this.components.geometry.radius) || 1;
  }

  get height() {
    return (this.components.geometry && this.components.geometry.height) || 1;
  }

  get primitive() {
    return (
      (this.components.geometry && this.components.geometry.primitive) || "box"
    );
  }

  setComponents({ componentDifferences, userViewId }) {
    this.log(
      `Received "set-components" event from userViewId "${userViewId}"`,
      componentDifferences
    );

    const wasPhysicsEnabled = this.isPhysicsEnabled;

    for (const componentName in componentDifferences) {
      // Check if component exists in the model - if it doesn't we'll assume componentDifferences[componentDifference] is the entire component
      if (componentName in this.components) {
        // check if this.components[componentName] is defined - otherwise we'll assume it was deleted and we'll remove it
        if (componentName in componentDifferences) {
          // check if componentDifferences[componentDifference] is an object - if so we can use Object.assign rather than just overwrite it
          if (typeof componentDifferences[componentName] === "object") {
            // check if the value is not null/undefined
            if (componentDifferences[componentName]) {
              // check each property of componentDifferences[propertyName] to see if it's not null - otherwise we'll delete that property
              for (const propertyName in componentDifferences[componentName]) {
                if (
                  typeof componentDifferences[componentName][propertyName] ===
                  "object"
                ) {
                  // may be an object/array or null
                  if (componentDifferences[componentName][propertyName]) {
                    this.components[componentName][propertyName] =
                      componentDifferences[componentName][propertyName];
                  } else {
                    delete this.components[componentName][propertyName];
                  }
                } else {
                  this.components[componentName][propertyName] =
                    componentDifferences[componentName][propertyName];
                }
              }
            } else {
              delete this.components[componentName];
            }
          } else {
            this.components[componentName] =
              componentDifferences[componentName];
          }
        } else {
          delete this.components[componentName];
        }
      } else {
        if (componentName in componentDifferences) {
          this.components[componentName] = componentDifferences[componentName];
        }
      }
    }

    // check if position/rotation/scale were changed, updating this.physicsBody and THREE.js position/quaternion/scale/matrix
    let didPositionRotationOrScaleUpdate = false;
    if ("position" in componentDifferences) {
      didPositionRotationOrScaleUpdate = true;

      for (const positionComponentName in componentDifferences.position) {
        this.position[positionComponentName] =
          componentDifferences.position[positionComponentName];
      }

      if (this.physicsBody && this.physicsBody.mass == 0) {
        this.physicsBody.position.copy(this.position);
      }
    }
    if ("rotation" in componentDifferences) {
      didPositionRotationOrScaleUpdate = true;

      for (const rotationComponentName in componentDifferences.rotation) {
        this.euler[rotationComponentName] = THREE.Math.degToRad(
          componentDifferences.rotation[rotationComponentName]
        );
      }

      this.quaternion.setFromEuler(this.euler);

      if (this.physicsBody && this.physicsBody.mass == 0) {
        this.physicsBody.quaternion.set(this.quaternion);
      }
    }
    if ("scale" in componentDifferences) {
      didPositionRotationOrScaleUpdate = true;

      for (const scaleComponentName in componentDifferences.scale) {
        this.scale[scaleComponentName] =
          componentDifferences.scale[scaleComponentName];
      }

      // TODO
      // here we'd change the physics body scale, but I may not get around to it...
      if (this.physicsBody) {
        switch (this.physicsBody.type) {
          case CANNON.Shape.TYPES.SPHERE:
            break;
          case CANNON.Shape.TYPES.BOX:
            break;
          case CANNON.Shape.TYPES.PLANE:
            break;
          case CANNON.Shape.TYPES.CYLINDER:
            break;
        }
        this.physicsBody.updateBoundingRadius();
      }
    }
    if (didPositionRotationOrScaleUpdate) {
      this.matrix.compose(this.position, this.quaternion, this.scale);
    }

    if ("croquet" in componentDifferences) {
      // check if mass was updated
      if ("mass" in componentDifferences.croquet && wasPhysicsEnabled) {
        // we can't change the mass of a body, so we'll have to create a new one
        if (this.physicsBody) {
          this.physicsBody.mass = this.mass;
          this.physicsBody.updateMassProperties();
        }
      }
    }

    if ("geometry" in componentDifferences) {
      // check if the primitive changed
      if ("primitive" in componentDifferences.geometry && wasPhysicsEnabled) {
        // if so, we reset the shape
        if (this.physicsBody) {
          this.physicsBody.shapes.forEach((shape) => {
            this.physicsBody.removeShape(shape);
            shape.destroy();
          });
          const shape = this.createShape();
          if (shape) {
            this.log(`UNABLE TO CREATE NEW SHAPE FOR ${this.primitive}`);
            this.physicsBody.addShape(shape);
          }
        }
      }
    }

    // check if this.components.croquet.physics component changed
    if (this.isPhysicsEnabled !== wasPhysicsEnabled) {
      if (this.isPhysicsEnabled) {
        this.log("Physics Enabled");
        // if physics is enabled, add position/rotation/scale components if not defined
        ["position", "rotation", "scale"].forEach((componentName) => {
          if (!(componentName in this.components)) {
            let defaultValue;
            switch (componentName) {
              case "position":
                defaultValue = { x: 0, y: 0, z: 0 };
                break;
              case "rotation":
                defaultValue = { x: 0, y: 0, z: 0 };
                break;
              case "scale":
                defaultValue = { x: 1, y: 1, z: 1 };
                break;
            }
            this.components[componentName] = defaultValue;
          }
        });
        this.addPhysicsBody();
      } else {
        this.log("Physics Disabled");
        this.removePhysicsBody();
        this.destroyPhysicsBody();
      }
    }
    this.log("updated components", this.components);
    const now = this.now();
    this.lastTimeComponentsWereSet = now;
    this.log("updated", this.lastTimeComponentsWereSet);
    this.lastTimeComponentsWereSetByUser[userViewId] = now;
  }

  createPhysicsBody() {
    let physicsBody;
    this.log("Creating Physics Body");
    if (!this.physicsBody && "geometry" in this.components) {
      const shape = this.createShape();
      if (shape) {
        physicsBody = CANNON.Body.create({
          shape,
          mass: this.mass,
          position: this.position,
          quaternion: this.quaternion,
        });
        physicsBody.name = this.name;
      }
    }
    this.log("Created physics body", physicsBody);
    return physicsBody;
  }

  createShape() {
    let shape;
    switch (this.primitive) {
      case "plane":
        // http://schteppe.github.io/cannon.js/docs/classes/Plane.html
        shape = CANNON.Plane.create();
        break;
      case "box":
        // http://schteppe.github.io/cannon.js/docs/classes/Box.html
        shape = CANNON.Box.create({
          halfExtents: new CANNON.Vec3(
            ...this.scale.clone().multiplyScalar(0.5).toArray()
          ),
        });
        break;
      case "sphere":
        // http://schteppe.github.io/cannon.js/docs/classes/Sphere.html
        shape = CANNON.Sphere.create({ radius: this.radius });
        break;
      case "cylinder":
        // http://schteppe.github.io/cannon.js/docs/classes/Cylinder.html
        shape = CANNON.Cylinder.create({
          radiusTop: this.radius,
          radiusBottom: this.radius,
          height: this.height,
          numSegments: this.components.geometry.segmentsRadial,
        });
        break;
    }
    this.log("Created shape", shape);
    return shape;
  }

  addPhysicsBody() {
    if (!this.physicsBody) {
      this.physicsBody = this.createPhysicsBody();
    }
    this.log("Adding Physics Body", this.physicsBody);
    this.physics.addBody(this.physicsBody);
  }
  onPhysicsBodyUpdate() {
    if (this.physicsBody && this.isPhysicsEnabled) {
      // updating position
      {
        const { x, y, z } = this.physicsBody.position;
        this.position.set(x, y, z);
        if ("position" in this.components) {
          Object.assign(this.components.position, { x, y, z });
        }
      }

      // updating rotation
      {
        const { x, y, z, w } = this.physicsBody.quaternion;
        this.quaternion.set(x, y, z, w);
        this.euler.setFromQuaternion(this.quaternion);
        if ("rotation" in this.components) {
          let { x, y, z } = this.euler;
          (x = THREE.Math.radToDeg(x)),
            (y = THREE.Math.radToDeg(y)),
            (z = THREE.Math.radToDeg(z)),
            Object.assign(this.components.rotation, { x, y, z });
        }
      }

      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.lastTimePhysicsBodyWasSet = this.now();
    }
  }
  removePhysicsBody() {
    if (this.physicsBody) {
      this.log("Removing Physics Body");
      this.physics.removeBody(this.physicsBody);
    }
  }

  destroyPhysicsBody() {
    if (this.physicsBody) {
      this.log("Destroying Physics Body");
      this.physicsBody.destroy();
      delete this.physicsBody;
    }
  }
  onViewExit(userViewId) {
    delete this.lastTimeComponentsWereSetByUser[userViewId];
  }

  destroy() {
    super.destroy();
    this.removePhysicsBody();
    this.destroyPhysicsBody();
  }
}
EntityModel.register("Entity");

export default EntityModel;
