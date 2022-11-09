# Learning WebVR with Croquet and A-Frame

## Try it Out!

Click on "Show" and pick "In a new Window" or "Next to the Code". Either way a new session will be created for you to play around.

If you open it in a new window you'll see "?q=YOUR_UNIQUE_NAME" is automatically added to the end of the url (e.g. https://croquet-hello-webvr.glitch.me/?q=abc123).
You can invite others to your session by sharing the url.
You can also set the name to whatever you want, e.g. "?q=croquetisawesome.

On desktop you can move around using the WASD keys and mouse.
On mobile you can look around by rotating the device, and move around by using the joystick that appears on the bottom right _(courtesy of [aframe-joystick](https://github.com/mrturck/aframe-joystick))_.

You can open up the [A-FRAME Inspector](https://aframe.io/docs/1.2.0/introduction/visual-inspector-and-dev-tools.html) on desktop by pressing `<ctrl> + <alt> + i`.
There you can add/modify/remove entities, as well as move around the scene.
_Note: you cannot move/rotate entities that have physics enabled. You must disable physics first._

In the browser console you can also add/modify/remove entities by manually creating entities, e.g.

```javascript
// grab the AFRAME scene
const scene = AFRAME.scenes[0];

// create an A-FRAME box
const myBox = document.createElement("a-box");

// set attributes (color, position, rotation, scale, etc)
myBox.setAttribute("color", "green");
myBox.setAttribute("position", "3 1 0");

// add the "croquet" attribute so it'll be added to the session
myBox.setAttribute("croquet", "");

// you can even add a "name: myName" to the attribute value if you want to give it a unique name (an entity cannot exist in the model with the same name).
// Otherwise a random name will be generated
myBox.setAttribute("croquet", "name: myBox");

// add our box to the scene
scene.appendChild(myEntity);
```

You can also open the browser console and check out the logged events to see what's going on under the hood.

## How it Works

**Loading Libraries**

_index.html_ loads the [A-FRAME SDK](), the [Croquet SDK](), [CANNON.js SDK](), and [a-frame joystick]()

**Constants**

_/script/constants.js_ contains a bunch of constants that Croquet uses for the session (physics engine config, flags to determine which events should be logged to the console, etc).
Croquet provides a global ([Croquet Constants Docs](https://croquet.studio/sdk/docs/global.html#Constants)).

**Joystick**

_/script/joystick.js_ checks if the page was loaded from a mobile device, and if so it'll add a virtual joystick that allows the user to move around.
(On mobile you're limited to just looking around using the device's orientation).
_Courtesy of [aframe-joystick](https://github.com/mrturck/aframe-joystick)_.

**System/Component**

_/script/system.js_ 

_/script/component.js_

**Session Start**

_/script.index.js_

**Waiting to Join**

_/script.View.js_

**Create User Entities**

_/script.View.js_

_/script.Model.js_

_/script.UserModel.js_

_/script.UserView.js_

**Create Entities**

_/script.View.js_

_/script.Model.js_

_/script.EntityModel.js_

_/script.EntityView.js_

**Modify Entities**

_/script.EntityView.js_

_/script.EntityModel.js_

## Forking and Remixing

**Glitch**

Click on "croquet-hello-webvr" at the top right and select Remix Project to create a new Glitch Project that copies this project.
You can modify this remix however you wish.

**GitHub**

You can also click "Tools" on the bottom left, select "import and export", and select "Export to GitHub".

**WARNING! Make sure to change the `appId` key in /script/system.js on line 17!
This is to make sure users using your application don't accidentally join users on this version if they use the same name!**

## Toggling Event Logging

In /script/constants.js you can can modify Q.LOGGING to change which events are logged in the console.
This will determine whether those models/views will use `this.log` defined in each module

## Documentation

[Croquet Docs](https://croquet.studio/sdk/docs/index.html)

[A-FRAME Docs](https://aframe.io/docs/)

[cannon.js Docs](https://github.com/schteppe/cannon.js)
