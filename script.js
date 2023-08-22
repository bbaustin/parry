//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                      Canvas and Global Stuff                                     //
//////////////////////////////////////////////////////////////////////////////////////////////////////
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let canvasPosition = getPositionRelativeToCanvas(canvas);
let mouseX = 0;
let mouseY = 0;
const blu = '#6a6aff';
const grn = '#bad500';
const red = '#ff6a6a';
const gry = '#6a6a6a';
// const pstr = document.getElementById('psTopRight');
// const psbr = document.getElementById('psBottomRight');
// const psbl = document.getElementById('psBottomLeft');
// const pstl = document.getElementById('psTopLeft');
// const estr = document.getElementById('esTopRight');
// const esbr = document.getElementById('esBottomRight');
// const esbl = document.getElementById('esBottomLeft');
// const estl = document.getElementById('esTopLeft');

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                               Sword                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class Sword {
  constructor({
    position = { x: 0, y: 0 },
    color = gry,
    defaultColor = gry,
    collidingColor = red,
    width = 10,
    height = 100,
    rotationAngle = 0,
    isColliding = false,
  }) {
    this.position = position;
    this.color = color;
    this.defaultColor = defaultColor;
    this.collidingColor = collidingColor;
    this.width = width;
    this.height = height;
    this.rotationAngle = rotationAngle;
    this.isColliding = isColliding;
  }

  draw(swordPosX, swordPosY) {
    context.beginPath();
    !this.isColliding
      ? (context.fillStyle = this.color)
      : (context.fillStyle = this.collidingColor);
    context.fillRect(
      swordPosX - this.width / 2,
      swordPosY - this.height,
      this.width,
      this.height
    );
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Player Sword                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class PlayerSword extends Sword {
  constructor() {
    super({
      position: { x: mouseX, y: mouseY },
      color: blu,
      defaultColor: blu,
      collidingColor: grn,
    });
  }

  checkSwordRotation() {
    // Why 9? The sword can rotate between -90 and 90 degrees.
    // I was moving the sword by 10 degrees, but that felt a bit fast. 5 degrees was a bit too slow. 9 degrees feels alright!
    // This also explains the 81 below (90 - 9 = 81).
    const angleInDegrees = 9;
    if (keyStateForPlayerSwordRotation.q && this.rotationAngle >= -81) {
      this.rotationAngle -= angleInDegrees;
    }
    if (keyStateForPlayerSwordRotation.e && this.rotationAngle <= 81) {
      this.rotationAngle += angleInDegrees;
    }
    // Save the context state before transformations
    context.save();
    // Apply rotation at the calculated center point
    context.translate(mouseX, mouseY);
    context.rotate((this.rotationAngle * Math.PI) / 180);
    context.translate(-mouseX, -mouseY);
    this.draw(mouseX, mouseY);
    // Restore the original context state
    context.restore();
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
// Let the color change
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
      defaultColor: red,
      collidingColor: gry,
    });
  }
}
const es = new EnemySword();

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                        Collision Detection                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////////
// NOTE: Major credit to Qixotl LFC: https://www.youtube.com/watch?v=MvlhMEE9zuc
// Also Pikuma: https://www.youtube.com/watch?v=-EsWKT7Doww&t=1686s
function rotatedCoordinatesHelper(
  centerX,
  centerY,
  vertexX,
  vertexY,
  rotatedAngle
) {
  //Convert rotated angle into radians
  rotatedAngle = (rotatedAngle * Math.PI) / 180;
  let dx = vertexX - centerX;
  let dy = vertexY - centerY;
  let distance = Math.sqrt(dx * dx + dy * dy);
  let originalAngle = Math.atan2(dy, dx);

  let rotatedX = centerX + distance * Math.cos(originalAngle + rotatedAngle);
  let rotatedY = centerY + distance * Math.sin(originalAngle + rotatedAngle);

  return {
    x: rotatedX,
    y: rotatedY,
  };
}

//Get the rotated coordinates for the sword
function getRotatedCoordinates(sword) {
  let centerX = sword.position.x + sword.width / 2;
  let centerY = sword.position.y + sword.height;
  let topLeft = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x,
    sword.position.y,
    sword.rotationAngle
  );
  // pstl.textContent = Math.floor(topLeft.x) + ', ' + Math.floor(topLeft.y);
  let topRight = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x + sword.width,
    sword.position.y,
    sword.rotationAngle
  );
  // pstr.textContent = Math.floor(topRight.x) + ', ' + Math.floor(topRight.y);
  let bottomLeft = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x,
    sword.position.y + sword.height,
    sword.rotationAngle
  );
  // psbl.textContent = Math.floor(bottomLeft.x) + ', ' + Math.floor(bottomLeft.y);
  let bottomRight = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x + sword.width / 2,
    sword.position.y + sword.height,
    sword.rotationAngle
  );
  // psbr.textContent =
  //   Math.floor(bottomRight.x) + ', ' + Math.floor(bottomRight.y);
  return {
    topLeft: topLeft,
    topRight: topRight,
    bottomLeft: bottomLeft,
    bottomRight: bottomRight,
  };
}

//Functional objects for the Separate Axis Theorem
//Single vertex
function xy(x, y) {
  this.x = x;
  this.y = y;
}
//The polygon that is formed from vertices and edges.
function polygon(vertices, edges) {
  this.vertex = vertices;
  this.edge = edges;
}

// This is applying the Separate Axis Theorem
function isColliding(polygonA, polygonB) {
  var perpendicularLine = null;
  // https://en.wikipedia.org/wiki/Dot_product
  var dot = 0;
  var perpendicularStack = [];
  var amin = null;
  var amax = null;
  var bmin = null;
  var bmax = null;
  //Get all perpendicular vectors on each edge for polygonA
  for (var i = 0; i < polygonA.edge.length; i++) {
    perpendicularLine = new xy(-polygonA.edge[i].y, polygonA.edge[i].x);
    perpendicularStack.push(perpendicularLine);
  }
  //Get all perpendicular vectors on each edge for polygonB
  for (var i = 0; i < polygonB.edge.length; i++) {
    perpendicularLine = new xy(-polygonB.edge[i].y, polygonB.edge[i].x);
    perpendicularStack.push(perpendicularLine);
  }
  //Loop through each perpendicular vector for both polygons
  for (var i = 0; i < perpendicularStack.length; i++) {
    //These dot products will return different values each time
    amin = null;
    amax = null;
    bmin = null;
    bmax = null;
    // Work out all of the dot products for all of the vertices in PolygonA against the perpendicular vector that is currently being looped through
    for (var j = 0; j < polygonA.vertex.length; j++) {
      dot =
        polygonA.vertex[j].x * perpendicularStack[i].x +
        polygonA.vertex[j].y * perpendicularStack[i].y;
      //Then find the dot products with the highest and lowest values from polygonA.
      if (amax === null || dot > amax) {
        amax = dot;
      }
      if (amin === null || dot < amin) {
        amin = dot;
      }
    }
    // Work out all of the dot products for all of the vertices in PolygonB against the perpendicular vector that is currently being looped through
    for (var j = 0; j < polygonB.vertex.length; j++) {
      dot =
        polygonB.vertex[j].x * perpendicularStack[i].x +
        polygonB.vertex[j].y * perpendicularStack[i].y;
      //Then find the dot products with the highest and lowest values from polygonB.
      if (bmax === null || dot > bmax) {
        bmax = dot;
      }
      if (bmin === null || dot < bmin) {
        bmin = dot;
      }
    }
    //If there is no gap between the dot products projection then we will continue onto evaluating the next perpendicular edge.
    if ((amin < bmax && amin > bmin) || (bmin < amax && bmin > amin)) {
      continue;
    }
    //Otherwise, we know that there is no collision
    else {
      return false;
    }
  }
  // If we have gotten this far, we have looped through all of the perpendicular edges no projections had a gap in them. Thus the 2 polygons are colliding.
  return true;
}

//Detect for a collision between the 2 rectangles
function detectRectangleCollision(index) {
  let thisSword = activeSwords[index];
  let otherSword = index === 0 ? activeSwords[1] : activeSwords[0];
  //Get rotated coordinates for both rectangles
  let thisSwordRotatedXY = getRotatedCoordinates(thisSword);
  let otherSwordRotatedXY = getRotatedCoordinates(otherSword);
  //Vertices & Edges are listed in clockwise order. Starting from the top right
  let thisSwordVertices = [
    new xy(thisSwordRotatedXY.topRight.x, thisSwordRotatedXY.topRight.y),
    new xy(thisSwordRotatedXY.bottomRight.x, thisSwordRotatedXY.bottomRight.y),
    new xy(thisSwordRotatedXY.bottomLeft.x, thisSwordRotatedXY.bottomLeft.y),
    new xy(thisSwordRotatedXY.topLeft.x, thisSwordRotatedXY.topLeft.y),
  ];
  let thisSwordEdges = [
    new xy(
      thisSwordRotatedXY.bottomRight.x - thisSwordRotatedXY.topRight.x,
      thisSwordRotatedXY.bottomRight.y - thisSwordRotatedXY.topRight.y
    ),
    new xy(
      thisSwordRotatedXY.bottomLeft.x - thisSwordRotatedXY.bottomRight.x,
      thisSwordRotatedXY.bottomLeft.y - thisSwordRotatedXY.bottomRight.y
    ),
    new xy(
      thisSwordRotatedXY.topLeft.x - thisSwordRotatedXY.bottomLeft.x,
      thisSwordRotatedXY.topLeft.y - thisSwordRotatedXY.bottomLeft.y
    ),
    new xy(
      thisSwordRotatedXY.topRight.x - thisSwordRotatedXY.topLeft.x,
      thisSwordRotatedXY.topRight.y - thisSwordRotatedXY.topLeft.y
    ),
  ];
  let otherSwordVertices = [
    new xy(otherSwordRotatedXY.topRight.x, otherSwordRotatedXY.topRight.y),
    new xy(
      otherSwordRotatedXY.bottomRight.x,
      otherSwordRotatedXY.bottomRight.y
    ),
    new xy(otherSwordRotatedXY.bottomLeft.x, otherSwordRotatedXY.bottomLeft.y),
    new xy(otherSwordRotatedXY.topLeft.x, otherSwordRotatedXY.topLeft.y),
  ];
  let otherSwordEdges = [
    new xy(
      otherSwordRotatedXY.bottomRight.x - otherSwordRotatedXY.topRight.x,
      otherSwordRotatedXY.bottomRight.y - otherSwordRotatedXY.topRight.y
    ),
    new xy(
      otherSwordRotatedXY.bottomLeft.x - otherSwordRotatedXY.bottomRight.x,
      otherSwordRotatedXY.bottomLeft.y - otherSwordRotatedXY.bottomRight.y
    ),
    new xy(
      otherSwordRotatedXY.topLeft.x - otherSwordRotatedXY.bottomLeft.x,
      otherSwordRotatedXY.topLeft.y - otherSwordRotatedXY.bottomLeft.y
    ),
    new xy(
      otherSwordRotatedXY.topRight.x - otherSwordRotatedXY.topLeft.x,
      otherSwordRotatedXY.topRight.y - otherSwordRotatedXY.topLeft.y
    ),
  ];
  let thisRectPolygon = new polygon(thisSwordVertices, thisSwordEdges);
  let otherRectPolygon = new polygon(otherSwordVertices, otherSwordEdges);

  if (isColliding(thisRectPolygon, otherRectPolygon)) {
    thisSword.isColliding = true;
    thisSword.color = thisSword.collidingColor;
  } else {
    thisSword.isColliding = false;
    thisSword.color = thisSword.defaultColor;
    //Below covers the case of two swords with rotationAngle 0
    if (thisSword.rotationAngle === 0 && otherSword.rotationAngle === 0) {
      if (
        !(
          thisSword.position.x > otherSword.position.x + otherSword.width ||
          thisSword.position.x + thisSword.width < otherSword.position.x ||
          thisSword.position.y > otherSword.position.y + otherSword.height ||
          thisSword.position.y + thisSword.height < otherSword.position.y
        )
      ) {
        thisSword.color = red;
      }
    }
  }
}
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
  ps.position.x = mouseX;
  ps.position.y = mouseY;
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

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                         Game Loop Stuff                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////

const activeSwords = [ps, es];
activeSwords.forEach((sword, index) => {
  detectRectangleCollision(index);
});

function gameLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  es.draw(es.position.x, es.position.y);
  ps.checkSwordRotation();
  activeSwords.forEach((sword, index) => {
    detectRectangleCollision(index);
  });
  // printEnemyXY();
  requestAnimationFrame(gameLoop);
}
gameLoop();

// function printEnemyXY() {
//   let topRight = {
//     x: es.position.x + es.width / 2,
//     y: es.position.y + es.height,
//   };
//   let bottomRight = { x: es.position.x + es.width / 2, y: es.position.y };
//   let bottomLeft = { x: es.position.x - es.width / 2, y: es.position.y };
//   let topLeft = {
//     x: es.position.x - es.width / 2,
//     y: es.position.y + es.height,
//   };
//
//   estr.textContent = Math.floor(topRight.x) + ', ' + Math.floor(topRight.y);
//   esbr.textContent =
//     Math.floor(bottomRight.x) + ', ' + Math.floor(bottomRight.y);
//   esbl.textContent = Math.floor(bottomLeft.x) + ', ' + Math.floor(bottomLeft.y);
//   estl.textContent = Math.floor(topLeft.x) + ', ' + Math.floor(topLeft.y);
// }
