import { Utils } from "../utils/Utils.js";

/* global Croquet */

class ContactMaterial extends Croquet.Model {
  log(string, ...etc) {
    if (!Croquet.Constants.LOGGING["CANNON.ContactMaterial"]) return;

    console.groupCollapsed(`[ContactMaterial-${this.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  init(options = {}) {
    super.init();

    let contactMaterialOptions = options.contactMaterialOptions || {};
    contactMaterialOptions = Utils.defaults(contactMaterialOptions, {
      friction: 0.3,
      restitution: 0.3,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
      frictionEquationStiffness: 1e7,
      frictionEquationRelaxation: 3
    });

    this._id = Number(this.id.split("/M")[1]);
    const { m1, m2 } = options;
    this.materials = [m1, m2];
    this.friction = contactMaterialOptions.friction;
    this.restitution = contactMaterialOptions.restitution;
    this.contactEquationStiffness =
      contactMaterialOptions.contactEquationStiffness;
    this.contactEquationRelaxation =
      contactMaterialOptions.contactEquationRelaxation;
    this.frictionEquationStiffness =
      contactMaterialOptions.frictionEquationStiffness;
    this.frictionEquationRelaxation =
      contactMaterialOptions.frictionEquationRelaxation;
  }
}
ContactMaterial.register("CANNON.ContactMaterial");

export { ContactMaterial };
