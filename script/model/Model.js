/* global Croquet, THREE, Q */
import UserModel from "./UserModel.js";
import EntityModel from "./EntityModel.js";
import PhysicsModel from "./PhysicsModel.js";

class Model extends Croquet.Model {
  init(options) {
    super.init();

    this.log("Setting up Model");

    this.physicsModel = PhysicsModel.create();

    this.userModels = [];
    // https://croquet.studio/sdk/docs/global.html#event:view-join
    this.subscribe(this.sessionId, "view-join", this.onViewJoin);
    // https://croquet.studio/sdk/docs/global.html#event:view-exit
    this.subscribe(this.sessionId, "view-exit", this.onViewExit);

    this.entityModels = [];
    this.subscribe("entities", "create-model", this.createEntityModel);
    this.subscribe("entities", "destroy-model", this.destroyEntityModel);

    this.subscribe(this.sessionId, "broadcast", this.broadcast);

    this.log("Finished setting up Model");
  }

  log(string, ...etc) {
    if (!Q.LOGGING.Model) return;

    console.groupCollapsed(`[Model] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  // USERS
  onViewJoin(userViewId) {
    this.log(
      `User with viewId "${userViewId}" triggered "view-join" event in Model`
    );
    this.log(`Adding userModel with userViewId "${userViewId}" to model.users`);

    const userModel = UserModel.create({ userViewId });
    this.userModels.push(userModel);
    this.publish("users", "did-join", userViewId);
    this.publish(userViewId, "did-join");
  }
  getUserModelByUserViewId(userViewId) {
    return this.userModels.find(
      userModel => userModel.userViewId === userViewId
    );
  }
  onViewExit(userViewId) {
    this.log(
      `User with viewId "${userViewId}" triggered "view-exit" event in Model`
    );

    const userModel = this.getUserModelByUserViewId(userViewId);
    if (userModel) {
      this.log(
        `Removing and Destroying userModel with userViewId "${userViewId}" from model.users`
      );

      // https://croquet.studio/sdk/docs/Model.html#destroy
      userModel.destroy();

      const index = this.userModels.indexOf(userModel);
      this.userModels.splice(index, 1);

      this.publish("users", "did-exit", userViewId);
    }
  }

  // ENTITIES
  getEntityModelByModelId(entityModelId) {
    return this.entityModels.find(
      entityModel => entityModel.id === entityModelId
    );
  }
  getEntityModelByName(entityName) {
    return this.entityModels.find(
      entityModel => entityModel.name === entityName
    );
  }
  createEntityModel({
    creatorUserViewId,
    name,
    parentName,
    tagName,
    components
  }) {
    this.log(`Received ("entities", "create-model") event in Model`);

    let entityModel = this.getEntityModelByName(name);
    if (!entityModel) {
      entityModel = EntityModel.create({
        creatorUserViewId,
        name,
        tagName,
        parentName,
        components
      });
      this.log(
        `Adding entityModel with name ${name} and model id "${entityModel.id}" to model.entityModels`
      );
      this.entityModels.push(entityModel);
      this.publish("entities", "did-create-model", entityModel.id);
    }
  }
  destroyEntityModel(entityModelId) {
    this.log(
      `Received "destroy-entity" event in Model for id "${entityModelId}"`
    );

    const entityModel = this.getEntityModelByModelId(entityModelId);
    if (entityModel) {
      this.log(
        `Removing and Destroying entity with model id "${entityModelId}" in model.entityModels`
      );

      // https://croquet.studio/sdk/docs/Model.html#destroy
      entityModel.destroy();

      const entityModelIndex = this.entityModels.indexOf(entityModel);
      this.entityModels.splice(entityModelIndex, 1);

      this.publish("entities", "did-destroy-model", entityModelId);
    }
  }

  // useful for rebroadcasting messages from one view, knowing it'll be
  broadcast({ scope, event, data }) {
    this.publish(scope, event, data);
  }
}
Model.register("Model");

export default Model;
