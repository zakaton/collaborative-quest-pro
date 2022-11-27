/* global Croquet, AFRAME, Q */

import UserView from "./UserView.js";
import EntityView from "./EntityView.js";
import DemosView from "./DemosView.js";
import ReadyPlayerMeView from "./ReadyPlayerMeView.js";

class View extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log("Starting View constructor");

    // used for generating entity names if not defined
    this.entityNameGeneratorConfig = {
      characters:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      characterLength: 10,
    };

    this.scene = AFRAME.scenes[0];

    this.userViews = [];
    this.entityViews = [];

    this.eventListeners = [];

    // check to see if the model has received our "view-join" event and created a user for you
    this.log(
      'Checking if Model has received our "view-join" event and created a UserModel for you'
    );
    if (this.hasJoined) {
      this.onJoin();
    } else {
      this.log(
        'Model has not received our "view-join" event. Waiting until it does'
      );
      this.subscribe(this.viewId, "did-join", this.onJoin);
    }
  }

  log(string, ...etc) {
    if (!Q.LOGGING.View) return;

    console.groupCollapsed(`[View] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  get hasJoined() {
    return this.model.getUserModelByUserViewId(this.viewId);
  }

  onJoin() {
    this.log("Model has created a UserModel for you");

    this.log("Creating Users already stored in the model");
    this.model.userModels.forEach((userModel) =>
      this.onUserJoin(userModel.userViewId)
    );

    this.log('Subscribing to user "did-join" and "did-exit" events');
    this.subscribe("users", "did-join", this.onUserJoin);
    this.subscribe("users", "did-exit", this.onUserExit);

    this.log("Creating Entities already stored in the model");
    this.model.entityModels.forEach((entityModel) =>
      this.onEntityModelCreated(entityModel.id)
    );

    this.log('Subscribing to entity "did-create" and "did-destroy" events');
    this.subscribe("entities", "did-create-model", this.onEntityModelCreated);
    this.subscribe(
      "entities",
      "did-destroy-model",
      this.onEntityModelDestroyed
    );

    this.log(
      'Iterating through entities in the current <a-scene> with the "croquet" component'
    );
    this.entities.forEach((entity) => this.onEntityAddedToScene(entity));

    this.log(
      'Listening for System "croquetentityadded" and "croquetentityremoved" events'
    );
    // these events are emitted in System.js when an entity with a "croquet" component is added to the scene
    this.addEventListener(this.scene, "croquetentityadded", (event) =>
      this.onEntityAddedToScene(event.detail.el)
    );
    this.addEventListener(this.scene, "croquetentityremoved", (event) =>
      this.onEntityRemovedFromScene(event.detail.el)
    );

    this.log("Creating Demos View");
    this.demosView = new DemosView(this.model);
    this.readyPlayerMeView = new ReadyPlayerMeView(
      this.model.readyPlayerMeModel
    );
  }

  // Helper for adding/removing eventlisteners to entities that automatically get removed when detaching from the session
  addEventListener(target, type, listener, options) {
    this.log(`Adding "${type}" eventlistener`, target);

    const boundListener = listener.bind(this);
    target.addEventListener(type, boundListener, options);
    this.eventListeners.push({ target, type, listener, boundListener });
  }
  removeEventListener(_target, _type, _listener) {
    const eventListenerObject = this.eventListeners.find(
      ({ target, type, listener }) => {
        return target === target && type === _type && listener === _listener;
      }
    );
    if (eventListenerObject) {
      const { target, type, boundListener } = eventListenerObject;
      this.log(`Removing "${type}" eventlistener`, target);
      target.removeEventListener(type, boundListener);

      const index = this.eventListeners.indexOf(eventListenerObject);
      this.eventListeners.splice(index, 1);
    }
  }
  // Removing all eventlisteners created so when we rejoin the session we won't trigger eventlisteners added in the previous session
  removeAllEventListeners() {
    this.eventListeners.forEach(({ target, type, boundListener }) => {
      this.log(`Removing "${type}" eventlistener`, target);
      target.removeEventListener(type, boundListener);
    });
    this.eventListeners.length = 0;
  }

  // A-FRAME getters
  get system() {
    return this.scene.systems.croquet;
  }
  // returns all A-FRAME entities that have a "croquet" attribute/component
  get entities() {
    return this.system.entities;
  }

  // USERS
  getUserViewByUserViewId(userViewId) {
    return this.userViews.find(
      (userView) => userView.userViewId === userViewId
    );
  }
  getUserModelByViewId(userViewId) {
    return this.model.getUserModelByUserViewId(userViewId);
  }
  onUserJoin(userViewId) {
    this.log(
      `User with userViewId "${userViewId}"${
        userViewId === this.viewId ? " (YOU)" : ""
      } joined`
    );
    const userModel = this.getUserModelByViewId(userViewId);
    if (userModel) {
      const userView = new UserView(userModel);
      this.userViews.push(userView);
    }
  }
  onUserExit(userViewId) {
    this.log(
      `User with userViewId "${userViewId}"${
        userViewId === this.viewId ? " (YOU)" : ""
      }  exited`
    );

    const userView = this.getUserViewByUserViewId(userViewId);
    if (userView) {
      // https://croquet.studio/sdk/docs/View.html#detach
      userView.detach();

      const index = this.userViews.indexOf(userView);
      this.userViews.splice(index, 1);
    }
  }

  // ENTITIES
  getEntityViewByModelId(entityModelId) {
    return this.entityViews.find((entity) => entity.model.id === entityModelId);
  }

  getEntityViewByEntity(entity) {
    return this.entityViews.find((entityView) => entityView.entity === entity);
  }
  getEntityViewByName(name) {
    return this.entityViews.find((entityView) => entityView.name === name);
  }
  // When an Entity Model is created in model.entities
  onEntityModelCreated(entityModelId) {
    this.log(
      `EntityModel found in Model with model id "${entityModelId}". Looking for EntityModel in model.entityModels with the same model id`
    );
    const entityModel = this.model.getEntityModelByModelId(entityModelId);
    if (entityModel) {
      this.log("EntityModel found", entityModel);
      this.log("Creating EntityView for EntityModel");
      const entityView = new EntityView(entityModel);
      this.log("Created EntityView", entityView);
      this.entityViews.push(entityView);

      // if a new entity has been created, we can iterate through its children that may have delayed creating EntityViews
      if (entityView && entityView.entity.childElementCount > 0) {
        this.log(
          "Iterating through child entities to create any potential EntityViews"
        );
        Array.from(entityView.entity.children)
          .filter((childEntity) => this.entities.includes(childEntity))
          .forEach((childEntity) => this.onEntityAddedToScene(childEntity));
      }
    } else {
      this.log(`EntityModel not found with model id "${entityModelId}" `);
    }
  }
  onEntityModelDestroyed(entityModelId) {
    this.log(
      `Entity destroyed in Model with model id ${entityModelId}. Looking for EntityView in view.entityViews with the same model id`
    );
    const entityView = this.getEntityViewByModelId(entityModelId);
    if (entityView) {
      this.log(
        "EntityView found. Now detaching it and removing it from view.entityViews",
        entityView
      );
      entityView.detach(true);
      const entityViewIndex = this.entityViews.indexOf(entityView);
      this.entityViews.splice(entityViewIndex, 1);
    } else {
      this.log(
        "EntityView not found :/. Can't detach an EntityView if it doesn't exist..."
      );
    }
  }

  // generating a random name for entities created without a "name" attribute
  generateAUniqueEntityName() {
    const { characters, characterLength } = this.entityNameGeneratorConfig;
    let name;
    do {
      name = "";
      for (
        let characterIndex = 0;
        characterIndex < characterLength;
        characterIndex++
      ) {
        name += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
    } while (this.model.getEntityModelByName(name));
    return name;
  }

  // When an Entity with the "croquet" component is added to the scene
  // This may be from you adding an entity locally, or an entity being created from an EntityModel
  onEntityAddedToScene(entity) {
    this.log("Entity added to Scene", entity);

    this.log("Checking if an entity has an EntityView");
    let entityView = this.getEntityViewByEntity(entity);
    if (entityView) {
      this.log(
        "Entity already has an EntityView, and therefore an EntityModel. No need to create an EntityView nor EntityModel",
        entityView
      );
    } else {
      this.log(
        'Entity does not have an EntityView. Checking if entity has a parent with a "croquet" component',
        entity.parentEl
      );

      if (entity.parentEl.hasAttribute("croquet")) {
        this.log('Parent entity has a "croquet" component', entity.parentEl);

        this.log("Checking if entity has a name", entity);
        let name = entity.getAttribute("croquet").name;
        if (typeof name === "string" && name.length) {
          this.log(`Entity has name "${name}"`);
        } else {
          this.log("Entity does not have a name. Creating a name now.");
          name = this.generateAUniqueEntityName();
          this.log(`Generated name ${name}`);
          entity.setAttribute("croquet", "name", name);
        }

        this.log("Checking if parent entity is the scene entity");
        if (entity.parentEl === entity.sceneEl) {
          this.log("Parent Entity is the scene entity");
          this.log("Checking if entity has an EntityModel");
          const entityModel = this.model.getEntityModelByName(name);
          if (entityModel) {
            this.log("Entity has an Entity Model", entityModel);
            entityView = new EntityView(entityModel);
            this.log("Created EntityView", entityView);
            this.entityViews.push(entityView);
          } else {
            this.log(
              "Entity does not have an Entity Model. Creating one now",
              entity
            );
            entity.setAttribute("croquet", "creator", this.viewId);
            this.publish("entities", "create-model", {
              creatorUserViewId: this.viewId,
              tagName: entity.tagName,
              name,
              components: this.getEntityComponents(entity),
            });
          }
        } else {
          this.log("Parent Entity is not the scene entity");

          this.log("Checking if parent entity has a name", entity.parentEl);
          const parentName = entity.parentEl.getAttribute("croquet").name;
          if (typeof parentName == "string" && parentName.length) {
            this.log(`parent entity has name "${parentName}"`);
            this.log(
              "Checking if parent entity has an EntityView attached to it"
            );
            const parentEntityView = this.getEntityViewByEntity(
              entity.parentEl
            );
            if (parentEntityView) {
              this.log(
                "Parent Entity has an Entity View attached to it",
                parentEntityView
              );
              this.log("Checking if Entity has an EntityModel");
              const entityModel = this.model.getEntityModelByName(name);
              if (entityModel) {
                this.log("Entity has an Entity Model", entityModel);
                entityView = new EntityView(entityModel);
                this.log("Created EntityView", entityView);
                this.entityViews.push(entityView);
              } else {
                this.log(
                  "Entity does not have an Entity Model. Creating one now"
                );
                entity.setAttribute("croquet", "creator", this.viewId);
                this.publish("entities", "create-model", {
                  creatorUserViewId: this.viewId,
                  tagName: entity.tagName,
                  name,
                  parentName,
                  components: this.getEntityComponents(entity),
                });
              }
            } else {
              this.log(
                "Parent Entity does not have an EntityView attached to it. I guess we'll wait until it does :)"
              );
            }
          } else {
            this.log(
              "Parent Entity doesn't have a name. We'll wait for a name to be generated for it"
            );
          }
        }
      } else {
        this.log(
          'Parent entity does not have a "croquet" component. Not creating an Entity Model/View for it :/'
        );
      }

      // if a new entity has been created, we can iterate through its children that may have delayed creating EntityViews
      if (entityView && entityView.entity.childElementCount > 0) {
        this.log(
          "Iterating through child entities to create any potential EntityViews"
        );
        Array.from(entity.children)
          .filter((childEntity) => this.entities.includes(childEntity))
          .forEach((childEntity) => this.onEntityAddedToScene(childEntity));
      }
    }
  }
  // This may be triggered if you manually remove an entity locally or a remote user removes the entity, triggering an ("entities", "destroy-model") event, which is then removed locally automatically
  onEntityRemovedFromScene(entity) {
    this.log("Entity removed from Scene", entity);
    this.log("Checking if Entity has an EntityView");
    const entityView = this.getEntityViewByEntity(entity);
    if (entityView) {
      this.log("Entity has EntityView", entityView);
      this.log(
        "Checking if EntityView has an EntityModel in model.entityModels"
      );
      const entityModel = this.model.getEntityModelByModelId(
        entityView.model.id
      );
      if (entityModel) {
        this.log("Entity has an EntityModel", entityModel);
        this.log("Attempting to destroy EntityModel");
        this.publish("entities", "destroy-model", entityView.model.id);
      } else {
        this.log(
          "Entity's EntityModel does not exist in model.entityModels. It was probably destroyed, so no need to re-destroy it."
        );
      }
    } else {
      this.log("Entity does not have an EntityView");
    }
  }

  getEntityComponents(entity) {
    const components = {};
    for (name in entity.components) {
      components[name] = entity.components[name].data;
    }
    return components;
  }

  update() {
    this.userViews.forEach((userView) => userView.update());
    this.entityViews.forEach((entityView) => entityView.update());
    this.readyPlayerMeView?.update();
  }

  // helper function for broadcasting
  broadcast(scope, event, data) {
    this.publish(this.sessionId, "broadcast", { scope, event, data });
  }

  // to move every

  detach() {
    super.detach();
    this.log("Detaching");

    this.log("Removing All Eventlisteners");
    this.removeAllEventListeners();

    this.log("Detaching all UserViews");
    this.userViews.forEach((userView) => userView.detach());

    this.log("Detaching all EntityViews");
    this.entityViews.forEach((entityView) => entityView.detach());

    if (this.demosView) {
      this.demosView.detach();
    }
  }
}

export default View;
