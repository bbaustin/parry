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
// Refers to frame of gameLoop. Used for some timing stuff
let tick = 0;
let score = 0;
const scoreBoard = document.getElementById('scoreBoard');

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

  draw() {
    context.beginPath();
    !this.isColliding
      ? (context.fillStyle = this.color)
      : (context.fillStyle = this.makeGradient());
    context.fillRect(
      this.position.x - this.width / 2,
      this.position.y - this.height,
      this.width,
      this.height
    );
  }

  drawRotation() {
    // Save the context state before transformations
    context.save();
    // Apply rotation at the calculated center point
    context.translate(this.position.x, this.position.y);
    context.rotate((this.rotationAngle * Math.PI) / 180);
    context.translate(-this.position.x, -this.position.y);
    this.draw();
    // Restore the original context state
    context.restore();
  }

  makeGradient() {
    const first = this.position.x - this.width / 2;
    const second = this.position.y;
    const third = this.position.x + this.width / 2;
    const fourth = this.position.y - this.height;
    const colorStopBeg = 0;
    const colorStopMid = 0.5;
    const colorStopEnd = 1.0;
    const gradient = context.createLinearGradient(first, second, third, fourth);
    gradient.addColorStop(colorStopBeg, 'purple');
    gradient.addColorStop(colorStopMid, 'purple');
    gradient.addColorStop(colorStopMid, 'hotpink');
    gradient.addColorStop(colorStopEnd, 'hotpink');
    return gradient;
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
    this.drawRotation();
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
  constructor(id = tick, timeSpentColliding = 0, parried = false) {
    super({
      position: { x: enemySwordLocation.x, y: enemySwordLocation.y },
      color: red,
      defaultColor: red,
      collidingColor: gry,
    });
    this.id = id;
    this.timeSpentColliding = timeSpentColliding;
    this.parried = parried;
  }
  timeSpentColliding = this.timeSpentColliding;
  computeTimeToDeletion() {
    if (this.timeSpentColliding >= 100) {
      const addedScore =
        90 - Math.abs(90 - Math.abs(this.rotationAngle - ps.rotationAngle));
      console.log(addedScore);
      score += addedScore;
      scoreBoard.textContent = score;
      // NOTE: Your current implementation works better than below, because there's no flickering.. But in case you need this solution (removing from activeSwords, I'll leave it for the time being)
      // const indexToDelete = activeSwords.findIndex((sword) => {
      //   return sword.id === this.id;
      // });
      // activeSwords.splice(indexToDelete, 1);
      this.parried = true;
    }
    if (this.isColliding) {
      this.timeSpentColliding++;
    } else {
      if (this.timeSpentColliding > 0) this.timeSpentColliding--;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Enemy Patterns                                         //
//////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 0- info (start screen or score from last)
 * 1- play (show canvas)
 */
let gameState = 0;
function increaseGameState() {
  if (gameState === 0) return (gameState = 1);
  return (gameState = 0);
}

//const enemyPatterns = ['peasant', 'barbarian', 'dual wielder', 'duelist', 'paladin', 'crusader'];
/**
 * 0 - peasant (random)
 * 1 - barbarian (straight line attacks)
 * 2 - dual wielder (close by attacks)
 * 3 - duelist (up and down with opposite angles)
 * 4 - paladin/high-int barb (straight line attacks but random angles)
 * 5 - crusader (far away attacks)
 */
let enemyState = 0;

// TODO: Later, add "pattern" as a parameter
let pushedSwords = 0;

/////////////
// Enemies //
////////////
function peasant() {
  console.log(pushedSwords);
  if (pushedSwords < 5) {
    pushSword(300, 100, 600, 100, 400, Math.random() > 0.5 ? 90 : 0);
  } else if (pushedSwords < 10) {
    pushSword(150, 100, 600, 100, 400, getRandomInt(0, 359));
  } else {
    // pushedSwords = 0;
    increaseGameState();
    enemyState++;
  }
}

function pushPeasantSword(msDelay) {
  if (tick % msDelay === 0) {
    console.log(tick, msDelay);
    const newEs = new EnemySword();
    const randomLocation = getRandomLocation();
    newEs.position = randomLocation;
    newEs.rotationAngle = Math.random() > 0.5 ? 90 : 0; // getRandomInt(-90, 90)
    activeSwords.push(newEs);
    pushedSwords++;
    console.log(activeSwords);
  }
}

function barbarian() {
  const msDelay = 50;
  const barbarianX = (pushedSwords % 4) * 150 + 100;
  if (pushedSwords < 4) {
    pushSword(msDelay, barbarianX, barbarianX, 100, 100, 90);
  } else if (pushedSwords < 8) {
    pushSword(msDelay, barbarianX, barbarianX, 225, 225, 0);
  } else if (pushedSwords < 12) {
    pushSword(msDelay, barbarianX, barbarianX, 350, 350, 90);
  } else if (pushedSwords < 16) {
    pushSword(msDelay, barbarianX, barbarianX, 475, 475, 0);
  }
}

function paladin() {
  const msDelay = 50;
  const barbarianX = (pushedSwords % 4) * 150 + 100;
  if (pushedSwords < 4) {
    pushSword(msDelay, barbarianX, barbarianX, 100, 100, getRandomInt(0, 359));
  } else if (pushedSwords < 8) {
    pushSword(msDelay, barbarianX, barbarianX, 225, 225, getRandomInt(0, 359));
  } else if (pushedSwords < 12) {
    pushSword(msDelay, barbarianX, barbarianX, 350, 350, getRandomInt(0, 359));
  } else if (pushedSwords < 16) {
    pushSword(
      msDelay,
      barbarianX,
      barbarianX,
      475,
      475,
      getRandomInt(-100, 100)
    );
  }
}

function duelist() {
  const msDelay = 50;
  const duelistY = [100, 225, 350, 475];
  let duelistX;

  if (pushedSwords < 16) {
    if (pushedSwords < 4) {
      duelistX = 150;
    } else if (pushedSwords < 8) {
      duelistX = 600; // getRandomInt(100, 600);
    } else if (pushedSwords < 12) {
      duelistX = 300;
    } else if (pushedSwords < 16) {
      duelistX = 500;
    }

    pushSword(
      msDelay,
      pushedSwords % 2 === 0 ? duelistX : duelistX - 45,
      pushedSwords % 2 === 0 ? duelistX : duelistX - 45,
      duelistY[pushedSwords % 4], // Adjusted the array index
      duelistY[pushedSwords % 4], // Adjusted the array index
      pushedSwords % 2 === 0 ? -45 : 45
    );
  }
}

function dualWielder() {}

function crusader() {}

/////////////////
// Enemy Utils //
////////////////

function pushSword(msDelay, x1, x2, y1, y2, angle) {
  if (tick % msDelay === 0) {
    const newEs = new EnemySword();
    const location = getRandomConstrainedLocation(x1, x2, y1, y2);
    newEs.position = location;
    newEs.rotationAngle = angle;
    activeSwords.push(newEs);
    pushedSwords++;
  }
}
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
  if (index === 0) return;
  const thisSword = activeSwords[index];
  const playerSword = activeSwords[0];
  //Get rotated coordinates for both rectangles
  let thisSwordRotatedXY = getRotatedCoordinates(thisSword);
  let playerSwordRotatedXY = getRotatedCoordinates(playerSword);
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
  let playerSwordVertices = [
    new xy(playerSwordRotatedXY.topRight.x, playerSwordRotatedXY.topRight.y),
    new xy(
      playerSwordRotatedXY.bottomRight.x,
      playerSwordRotatedXY.bottomRight.y
    ),
    new xy(
      playerSwordRotatedXY.bottomLeft.x,
      playerSwordRotatedXY.bottomLeft.y
    ),
    new xy(playerSwordRotatedXY.topLeft.x, playerSwordRotatedXY.topLeft.y),
  ];
  let playerSwordEdges = [
    new xy(
      playerSwordRotatedXY.bottomRight.x - playerSwordRotatedXY.topRight.x,
      playerSwordRotatedXY.bottomRight.y - playerSwordRotatedXY.topRight.y
    ),
    new xy(
      playerSwordRotatedXY.bottomLeft.x - playerSwordRotatedXY.bottomRight.x,
      playerSwordRotatedXY.bottomLeft.y - playerSwordRotatedXY.bottomRight.y
    ),
    new xy(
      playerSwordRotatedXY.topLeft.x - playerSwordRotatedXY.bottomLeft.x,
      playerSwordRotatedXY.topLeft.y - playerSwordRotatedXY.bottomLeft.y
    ),
    new xy(
      playerSwordRotatedXY.topRight.x - playerSwordRotatedXY.topLeft.x,
      playerSwordRotatedXY.topRight.y - playerSwordRotatedXY.topLeft.y
    ),
  ];
  let thisRectPolygon = new polygon(thisSwordVertices, thisSwordEdges);
  let otherRectPolygon = new polygon(playerSwordVertices, playerSwordEdges);

  if (isColliding(thisRectPolygon, otherRectPolygon)) {
    thisSword.isColliding = true;
    thisSword.color = thisSword.collidingColor;
  } else {
    thisSword.isColliding = false;
    thisSword.color = thisSword.defaultColor;
    //Below covers the case of two swords with rotationAngle 0
    if (thisSword.rotationAngle === 0 && playerSword.rotationAngle === 0) {
      // TODO: Only this case??
      if (
        !(
          thisSword.position.x > playerSword.position.x + playerSword.width ||
          thisSword.position.x + thisSword.width < playerSword.position.x ||
          thisSword.position.y > playerSword.position.y + playerSword.height ||
          thisSword.position.y + thisSword.height < playerSword.position.y
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
  const randomX = 100 + Math.random() * (canvas.width - 100);
  const randomY = 100 + Math.random() * (canvas.height - 100);
  return { x: randomX, y: randomY };
}

function getRandomConstrainedLocation(xMin, xMax, yMin, yMax) {
  const randomX = Math.random() * (xMax - xMin + 1) + xMin;
  const randomY = Math.random() * (yMax - yMin + 1) + yMin;
  const ok = { x: randomX, y: randomY };
  console.log(ok);
  return { x: randomX, y: randomY };
}

// Below causes collision bug. No idea why lol
// function getRandomConstrainedLocationWhy(x, y) {
//   const constrainedX = typeof x === 'number' ? x : getRandomInt(x[0], x[1]);
//   const constrainedY = typeof y === 'number' ? y : getRandomInt(y[0], y[1]);
//   const ok = { x: constrainedX, y: constrainedY };
//   console.log(ok);
//   return { x: constrainedX, y: constrainedY };
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                         Game Loop Stuff                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////
const es2 = new EnemySword();
es2.position = { x: 100, y: 100 };
const activeSwords = [ps];
// Where you're at: can you get another sword to render? You have to change your detection code a bit, which is causing a specific angle to not detect :D

// // TODO: Later, add "pattern" as a parameter
// function addEnemySwords() {
//   if (tick % 300 === 0) {
//     const newEs = new EnemySword();
//     const randomLocation = getRandomLocation();
//     newEs.position = randomLocation;
//     newEs.rotationAngle = Math.random() > 0.5 ? 90 : 0;
//     activeSwords.push(newEs);
//     console.log(newEs);
//     console.log(activeSwords);
//   }
// }

activeSwords.forEach((sword, index) => {
  detectRectangleCollision(index);
});

function gameLoop() {
  tick++;
  context.clearRect(0, 0, canvas.width, canvas.height);
  // es.draw(es.position.x, es.position.y);
  ps.checkSwordRotation();
  activeSwords.forEach((sword, index) => {
    if (index === 0) return;
    if (sword.parried) return;
    detectRectangleCollision(index);
    sword.drawRotation();
    sword.computeTimeToDeletion();
  });
  // peasant();
  // barbarian();
  // paladin();
  duelist();
  requestAnimationFrame(gameLoop);
}
gameLoop();
