// Constants used by Croquet for stuff like logging, physics engine config, etc

/* global Croquet */
const Q = Croquet.Constants;
Q.LOGGING = {
  index: false,

  system: false,
  component: false,

  Model: false,
  View: false,

  UserModel: false,
  UserView: false,

  HandTrackingControlsModel: false,
  HandTrackingControlsView: false,

  EntityModel: false,
  EntityView: false,

  PhysicsModel: false,

  DemosView: false,

  ReadyPlayerMeView: true,
  ReadyPlayerMeModel: true,
};

Q.GRAVITY = -9.82;
Q.STEP_MS = 1000 / 20;
