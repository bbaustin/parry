//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                              Canvas                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let canvasPosition = getPositionRelativeToCanvas(canvas);
let mouseX = 0;
let mouseY = 0;
let playerSwordWidth = 10;
let playerSwordHeight = 100;
let playerSwordRotationAngle = 0;

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Player Sword                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

let keyStateForPlayerSwordRotation = {
  q: false,
  e: false,
};

/**
 * Draw Player (blue) sword on canvas. To be run in Game Loop.
 */
function drawPlayerSword() {
  context.beginPath();
  context.fillRect(
    mouseX - playerSwordWidth / 2,
    mouseY - playerSwordHeight,
    playerSwordWidth,
    playerSwordHeight
  );
  context.fillStyle = '#6A6AFF';
  context.fill();
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

/**
 * Based on keyState, actually do the rotation.
 * Need to translate the sword first, or else it automatically rotates anchored from the top-left of the canvas (0,0)
 * Pretty weird... See here for more details: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
 */
function checkPlayerSwordRotate() {
  // Why 9? The sword can rotate between -90 and 90 degrees.
  // I was moving the sword by 10 degrees, but that felt a bit fast. 5 degrees was a bit too slow. 9 degrees feels alright!
  // This also explains the 81 below (90 - 9 = 81).
  const angleInDegrees = 9;
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (keyStateForPlayerSwordRotation.q && playerSwordRotationAngle >= -81) {
    playerSwordRotationAngle -= angleInDegrees;
  }

  if (keyStateForPlayerSwordRotation.e && playerSwordRotationAngle <= 81) {
    playerSwordRotationAngle += angleInDegrees;
  }

  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Save the context state before transformations
  context.save();

  // Apply rotation at the calculated center point
  context.translate(mouseX, mouseY);
  context.rotate((playerSwordRotationAngle * Math.PI) / 180);
  context.translate(-mouseX, -mouseY);

  drawPlayerSword();

  // Restore the original context state
  context.restore();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Enemy Sword                                            //
//////////////////////////////////////////////////////////////////////////////////////////////////////

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
 * Generates a random integer within the specified range.
 *
 * @param {number} min - The minimum value of the range (inclusive).
 * @param {number} max - The maximum value of the range (inclusive).
 * @returns {number} A random integer within the specified range.
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gameLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayerSword();
  checkPlayerSwordRotate();
  requestAnimationFrame(gameLoop);
}
gameLoop();
