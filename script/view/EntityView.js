/* global Croquet, AFRAME, Q */

class EntityView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;

    this.log("Creating Entity View");

    this.scene = AFRAME.scenes[0];

    this.eventListeners = [];

    this.lastTimeComponentsWereUpdated = 0;
    this.lastTimePhysicsBodyWasUpdated = 0;

    this.parentEntity = this.parentName
      ? this.getEntityByName(name)
      : this.scene;

    this.log(`Looking for entity with name "${this.name}"`);
    this.entity = this.getEntityByName(this.name);

    // sometimes some components won't be initialized at first and will become initialized during runtime
    // we don't want to accidentally trigger a "set-components" model event when the initial component values differ from the model components
    this.componentsWaitingToBeInitialized = new Set();
    if (this.entity && this.entity.hasLoaded) {
      for (const componentName in this.model.components) {
        const isComponentInitialized =
          componentName in this.entity.components &&
          this.entity.components[componentName].initialized;
        if (!isComponentInitialized) {
          this.componentsWaitingToBeInitialized.add(componentName);
        }
      }
    }

    // we throttle the "checkComponentsForDifferences" method so we don't publish our camera matrix at 60fps
    this.checkComponentsForDifferencesThrottled = AFRAME.utils.throttle(
      this.checkComponentsForDifferences,
      1000 / 12, // increase denominator for faster refresh rate
      this
    );

    this.updateComponentsThrottled = AFRAME.utils.throttle(
      this.updateComponents,
      1000 / 12, // increase denominator for faster refresh rate
      this
    );

    if (this.entity) {
      this.log("Found entity", this.entity);
      this.log('Assigning the model "croquet" component to the entity');
      this.addEventListener(
        this.entity,
        "componentinitialized",
        this.onComponentInitialized
      );
      this.entity.setAttribute("croquet", this.model.components.croquet);
      this.entity.components.croquet.flushToDOM();
      this.updateComponents();
    } else {
      this.log("Couldn't find entity. Creating an entity now");
      this.entity = document.createElement(this.tagName.toLowerCase());
      this.addEventListener(
        this.entity,
        "componentinitialized",
        this.onComponentInitialized
      );
      this.log("Created entity", this.entity);
      this.log('Assigning the model "croquet" component to the entity');
      this.entity.setAttribute(
        "croquet",
        AFRAME.components.croquet.stringify(this.model.components.croquet)
      );
      this.log("Creating components for entity");
      this.addEventListener(
        this.entity,
        "loaded",
        event => {
          this.log("Entity loaded", this.entity);
          this.updateComponents();
        },
        { once: true }
      );
      this.parentEntity.appendChild(this.entity);
    }
  }

  log(string, ...etc) {
    if (!Q.LOGGING.EntityView) return;
    
    console.groupCollapsed(`[EntityView-${this.model.id}] ${string}`, ...etc);
    console.trace(); // hidden in collapsed group
    console.groupEnd();
  }

  // we want to make sure entity components are initialized and set to the model's values before being checked by this.checkComponentsForDifferences
  onComponentInitialized(event) {
    const componentName = event.detail.name;
    this.log(`"${componentName} component initialized"`);

    // checking if the model has the component value stored. Otherwise this component was added locally so there's no model value
    if (componentName in this.model.components) {
      this.entity.setAttribute(
        componentName,
        this.entity.components[componentName].stringify(
          this.model.components[componentName]
        )
      );
    }

    this.componentsWaitingToBeInitialized.delete(componentName);
  }

  // EntityModel Getters
  get name() {
    return this.model.name;
  }
  get tagName() {
    return this.model.tagName;
  }
  get parentName() {
    return this.model.parentName;
  }
  get isPhysicsEnabled() {
    return this.model.isPhysicsEnabled;
  }
  get lastTimeComponentsWereSet() {
    return this.model.lastTimeComponentsWereSet;
  }
  get lastTimeComponentsWereSetByMe() {
    return this.model.lastTimeComponentsWereSetByUser[this.viewId] || 0;
  }
  get haveComponentsBeenUpdated() {
    // we use the EntityModel's "lastTimeComponentsWereSet" property and compare it to our local "lastTimeComponentsWereUpdated" to see if we should overwrite the entity's components
    // however if we were the ones who published it we shouldn't overwrite the components because it's redundant
    // so the EntityModel contains a {userViewId: timestamp} to distinguish when the last time each user has published a "set-components" event
    let haveComponentsBeenUpdated =
      this.lastTimeComponentsWereSet === this.lastTimeComponentsWereUpdated;
    if (!haveComponentsBeenUpdated) {
      if (
        this.lastTimeComponentsWereSet === this.lastTimeComponentsWereSetByMe
      ) {
        haveComponentsBeenUpdated = true;
        this.lastTimeComponentsWereUpdated = this.lastTimeComponentsWereSetByMe;
      }
    }
    return haveComponentsBeenUpdated;
  }
  get lastTimePhysicsBodyWasSet() {
    return this.model.lastTimePhysicsBodyWasSet;
  }
  get hasPhysicsBeenUpdated() {
    return this.lastTimePhysicsBodyWasSet === this.lastTimePhysicsBodyWasUpdated;
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

  getEntityByName(name) {
    return Array.from(
      document.querySelectorAll("a-scene[croquet] [croquet]")
    ).find(entity => {
      return entity.getAttribute("croquet") && (entity.getAttribute("croquet").name === name);
    });
  }

  getLocalComponents() {
    const components = {};
    if (this.entity && this.entity.hasLoaded) {
      for (const componentName in this.entity.components) {
        components[componentName] = this.entity.components[componentName].data;
      }
    }
    return components;
  }

  // when components are updated during runtime
  onEntityModelComponentUpdate(userViewId) {
    // we don't want to update components if we were the ones who updated it
    if (userViewId === this.viewId) {
      this.lastTimeComponentsWereUpdated = this.lastTimeComponentsWereSet;
    } else {
      this.updateComponents();
    }
  }

  getEntityComponentData(componentName) {
    let entityComponentData = this.entity.components[componentName].data;

    // special case for position/rotation/scale
    // changing the entity.object3D.position/.rotation/.scale doesn't reflect in entity.components.position.data/.rotation.data/.scale.data
    if (this.entity.components[componentName].isPositionRotationScale) {
      let { x, y, z } = this.entity.object3D[componentName];
      // entity.object3D.rotation stores rotation in radians, while entity.components.rotation.data stores it in degrees
      if (componentName === "rotation") {
        x = THREE.Math.radToDeg(x);
        y = THREE.Math.radToDeg(y);
        z = THREE.Math.radToDeg(z);
      }
      entityComponentData = { x, y, z };
    }
    return entityComponentData;
  }

  updateComponents(componentsToUpdate = Object.keys(this.model.components)) {
    if (this.entity && this.entity.hasLoaded) {
      // we'll uncomment this because it's really annoying
      //this.log("Updating Entity Components");
      componentsToUpdate.forEach(componentName => {
        // checking if the entity component has been initialized
        if (
          componentName in this.entity.components &&
          this.entity.components[componentName].initialized
        ) {
          // get difference between local entity component and model component
          const entityComponentData = this.getEntityComponentData(
            componentName
          );

          const componentDifference = AFRAME.utils.diff(
            this.model.components[componentName],
            entityComponentData
          );

          const attributeValue = this.entity.components[
            componentName
          ].stringify(this.model.components[componentName]);

          // check if there are any differences between the entity and model
          if (Object.keys(componentDifference).length) {
            // we also comment this out because it's annoying
            if (!this.isPhysicsEnabled) {
              this.log(
                `About to set "${componentName}" component with "${attributeValue}"`
              );
            }
            try {
              this.entity.setAttribute(componentName, attributeValue);
            } catch (error) {
              this.log("Error trying to set attribute", error);
            }

            // updating <a-entity /> attribute if it's position/rotation/scale or croquet
            if (
              this.entity.components[componentName].isPositionRotationScale ||
              componentName === "croquet"
            ) {
              this.entity.components[componentName].flushToDOM();
            }
          }
        } else {
          // this component was added during runtime by a remote user and hasn't been initialized yet
          // add the attribute and wait for the component to be initialized
          this.componentsWaitingToBeInitialized.add(componentName);
          this.entity.setAttribute(componentName, "");
        }
      });
      this.lastTimeComponentsWereUpdated = this.lastTimeComponentsWereSet;
    }
  }

  updatePhysicsComponents() {
    if (this.isPhysicsEnabled && !this.hasPhysicsBeenUpdated) {
      this.updateComponents(["position", "rotation"]);
    }
  }

  // compare component values stored in the model vs values stored in the entity itself
  // if there's a difference, then it must have changed locally, so we'll publish the change to the model
  checkComponentsForDifferences() {
    if (
      this.entity &&
      this.entity.hasLoaded &&
      this.haveComponentsBeenUpdated
    ) {
      // https://github.com/aframevr/aframe/blob/master/docs/core/utils.md#object-utils
      const componentDifferences = {};

      for (const componentName in this.entity.components) {
        if (
          componentName in this.entity.components &&
          this.entity.components[componentName].initialized &&
          !this.componentsWaitingToBeInitialized.has(componentName) &&
          !(
            this.isPhysicsEnabled &&
            this.entity.components[componentName].isPositionRotationScale
          ) // skip position/rotation/scale if physics is enabled
        ) {
          const entityComponentData = this.getEntityComponentData(
            componentName
          );

          let componentDifference = entityComponentData;

          // checks if the model even has this component value, using the data itself as the difference if it doesn't exist at all
          if (componentName in this.model.components) {
            componentDifference = AFRAME.utils.diff(
              this.model.components[componentName],
              entityComponentData
            );
          }

          // add to componentDifferences if this component has at least 1 difference
          if (Object.keys(componentDifference).length) {
            componentDifferences[componentName] = componentDifference;
            if (this.entity.components[componentName].isPositionRotationScale || componentName === "croquet") {
              this.entity.components[componentName].flushToDOM();
            }
            
            // undefined values, e.g. {x: undefined} don't get sent to the model via this.publish (it'll just receive {}) so we'll replace them with null
            for (const propertyName in componentDifferences[componentName]) {
              if (
                componentDifferences[componentName][propertyName] === undefined
              ) {
                componentDifferences[componentName][propertyName] = null;
              }
            }
          }
        }
      }

      if (Object.keys(componentDifferences).length) {
        this.log(
          "Detected difference in component values",
          componentDifferences
        );
        this.publish(this.model.id, "set-components", {
          componentDifferences,
          userViewId: this.viewId
        });
      }
    }
  }

  update() {
    // check if the EntityModel has been updated since last time and if so, we don't need to update components
    if (this.haveComponentsBeenUpdated) {
      this.checkComponentsForDifferencesThrottled();
    } else {
      this.updateComponents();
    }

    this.updatePhysicsComponents();
  }

  detach(removeEntity) {
    super.detach();
    if (removeEntity && this.entity && this.entity.attached) {
      this.entity.remove();
    }
    this.removeAllEventListeners();
    this.log("detaching self");
  }
}

export default EntityView;
