//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                      Canvas and Global Stuff                                     //
//////////////////////////////////////////////////////////////////////////////////////////////////////
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let canvasPosition = getPositionRelativeToCanvas(canvas);
let mouseX = 0;
let mouseY = 0;
const enemySwordWidth = 10;
const enemySwordHeight = 100;
const blu = '#6a6aff';
const grn = '#bad500';
const red = '#ff6a6a';
const gry = '#6a6a6a';

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                               Sword                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class Sword {
  constructor({
    position = { x: 0, y: 0 },
    color = gry,
    width = 10,
    height = 100,
    rotationAngle = 0,
    boundary = {
      top: position.y - height,
      bottom: position.y,
      left: position.x - width / 2,
      right: position.x + width / 2,
    },
  }) {
    this.position = position;
    this.color = color;
    this.width = width;
    this.height = height;
    this.rotationAngle = rotationAngle;
    this.boundary = boundary;
  }

  draw(swordPosX, swordPosY) {
    context.beginPath();
    context.fillStyle = this.color;
    context.fillRect(
      swordPosX - this.width / 2,
      swordPosY - this.height,
      this.width,
      this.height
    );
    // context.fill();
  }
}
//
// const playerTop = this.position.y - this.height;
// const playerBottom = this.position.y;
// const playerLeft = this.position.x - this.width / 2;
// const playerRight = this.position.x + this.width / 2;

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Player Sword                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class PlayerSword extends Sword {
  constructor() {
    super({
      position: { x: mouseX, y: mouseY },
      color: blu,
    });
  }

  updateBoundary() {
    // TODO: This is not taking into account angle.. do you need to do some mathy shit? --> See chat :D
    this.boundary = {
      top: mouseY - this.height,
      bottom: mouseY,
      left: mouseX - this.width / 2,
      right: mouseX + this.width / 2,
    };
  }

  checkSwordRotation() {
    // Why 9? The sword can rotate between -90 and 90 degrees.
    // I was moving the sword by 10 degrees, but that felt a bit fast. 5 degrees was a bit too slow. 9 degrees feels alright!
    // This also explains the 81 below (90 - 9 = 81).
    const angleInDegrees = 9;
    // context.clearRect(0, 0, canvas.width, canvas.height);

    if (keyStateForPlayerSwordRotation.q && this.rotationAngle >= -81) {
      this.rotationAngle -= angleInDegrees;
    }

    if (keyStateForPlayerSwordRotation.e && this.rotationAngle <= 81) {
      this.rotationAngle += angleInDegrees;
    }

    // Clear the canvas
    // context.clearRect(0, 0, canvas.width, canvas.height);

    // Save the context state before transformations
    context.save();

    // Apply rotation at the calculated center point
    context.translate(mouseX, mouseY);
    context.rotate((this.rotationAngle * Math.PI) / 180);
    context.translate(-mouseX, -mouseY);
    this.updateBoundary();

    this.draw(mouseX, mouseY);
    // Restore the original context state
    context.restore();
  }

  collisionDetection(enemy) {
    const { top, bottom, left, right } = this.boundary;
    const {
      top: enemyTop,
      bottom: enemyBottom,
      left: enemyLeft,
      right: enemyRight,
    } = enemy.boundary;
    if (
      bottom > enemyTop &&
      top < enemyBottom &&
      right > enemyLeft &&
      left < enemyRight
    ) {
      // Collision detected
      console.log('Collision detected!');
      this.color = grn;
      // Implement collision response here
    } else {
      this.color = blu;
    }
  }
}
const ps = new PlayerSword({});

/**
 * Used by event listeners directly below. Maybe should be in PlayerSword class, but I think I want it outside? Idk
 */
let keyStateForPlayerSwordRotation = {
  q: false,
  e: false,
};

/**
 * Update keyState for changing PlayerSword angle.
 */
document.addEventListener('keydown', (event) => {
  if (event.key === 'q') {
    keyStateForPlayerSwordRotation.q = true;
  } else if (event.key === 'e') {
    keyStateForPlayerSwordRotation.e = true;
  }
});
document.addEventListener('keyup', (event) => {
  if (event.key === 'q') {
    keyStateForPlayerSwordRotation.q = false;
  } else if (event.key === 'e') {
    keyStateForPlayerSwordRotation.e = false;
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Enemy Sword                                            //
//////////////////////////////////////////////////////////////////////////////////////////////////////
//TODO: Get random location
// DONE: Have sword show up
// DONE: Color it
// DONE: Add it in the game loop
// Let the color change
// Intersection
// Timing
// Related to all, probably need to make an enemySword class, since we'll have multiple on screen at once.
// + Break down top left, top right, bottom left, bottom right corners etc. for collision. And make easy to access

// NOTE: Right now, this doesn't really have to be a new class. It can just be a Sword. But you'll probably add stuff to it.
const enemySwordLocation = getRandomLocation();
class EnemySword extends Sword {
  constructor() {
    super({
      position: { x: enemySwordLocation.x, y: enemySwordLocation.y },
      color: red,
      rotationAngle: getRandomInt(0, 360), // TODO: this doesn't work right now, probably because I don't have a "check enemySwordRotation function"
    });
  }
}
const es = new EnemySword();

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                        Collision Detection                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////////

// function collisionDetection(playerSword, enemySword) {}
// collisionDetection();
//
// function handleCollision(result) {}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                              Utils                                               //
//////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Retrieves the position of an element relative to the canvas.
 * For more information, see here and search for "getPosition": https://www.kirupa.com/canvas/follow_mouse_cursor.htm
 *
 * @param {HTMLElement} element - The element for which to calculate the position.
 * @returns {{x: number, y: number}} The x and y coordinates of the element relative to the canvas.
 */
function getPositionRelativeToCanvas(element) {
  let xPosition = 0;
  let yPosition = 0;

  while (element) {
    xPosition += element.offsetLeft - element.scrollLeft + element.clientLeft;
    yPosition += element.offsetTop - element.scrollTop + element.clientTop;
    element = element.offsetParent;
  }
  return {
    x: xPosition,
    y: yPosition,
  };
}

/**
 * Move sword with mouse, taking into account position of canvas in window (canvasPosition)
 */
function setMousePositionForPlayerSword(e) {
  mouseX = e.clientX - canvasPosition.x;
  mouseY = e.clientY - canvasPosition.y;
}
canvas.addEventListener('mousemove', setMousePositionForPlayerSword);

/**
 * Generates a random integer within the specified range.
 *
 * @param {number} min - The minimum value of the range (inclusive).
 * @param {number} max - The maximum value of the range (inclusive).
 * @returns {number} A random integer within the specified range.
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomLocation() {
  const randomX = Math.random() * canvas.width;
  const randomY = Math.random() * canvas.height;
  return { x: randomX, y: randomY };
}

function gameLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  es.draw(es.position.x, es.position.y);
  // drawPlayerSword();
  ps.checkSwordRotation();
  ps.updateBoundary();
  ps.collisionDetection(es);
  requestAnimationFrame(gameLoop);
}
gameLoop();
