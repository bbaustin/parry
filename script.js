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
const rrr = '#ff0000';
const gry = '#6a6a6a';
// Refers to frame of gameLoop. Used for some timing stuff
let tick = 0;
let score = 0;
let roundScore = 0;
const scoreBoard = document.getElementById('scoreBoard');
const info = document.getElementById('info');
const nextEnemy = document.getElementById('next-enemy');
const nextEnemyDescription = document.getElementById('next-enemy-description');
const go = document.getElementById('go');
const ne = document.getElementById('ne');
const timeUntilParried = 33;
const timeUntilSliced = 75;
const grades = [
  'Parryble... (terrible)',
  'Not quite up to par(ry)',
  'Parry good',
  'Imparryssive',
  'Extraordinparry!',
  'Legendparry!',
];
let activeCollisionHappening = false;

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
    timeSpentColliding = 0,
    timeSpentOnScreen = 0,
    id = tick,
    sliced = false,
  }) {
    this.position = position;
    this.color = color;
    this.defaultColor = defaultColor;
    this.collidingColor = collidingColor;
    this.width = width;
    this.height = height;
    this.rotationAngle = rotationAngle;
    this.isColliding = isColliding;
    this.timeSpentColliding = timeSpentColliding;
    this.timeSpentOnScreen = timeSpentOnScreen;
    this.id = id;
    this.sliced = sliced;
  }

  draw() {
    context.beginPath();
    //or === 0? try. could also have a "isPlayer" attribute
    if (this.id < 50) {
      // only for PlayerSword
      if (activeCollisionHappening) {
        context.fillStyle = this.makeGradient(
          (this.timeSpentColliding * (100 / timeUntilParried)) / 100
        );
      } else {
        context.fillStyle = this.color;
      }
    } else {
      // only for enemy sword
      if (this.slicing) {
        // TODO: Maek this look more like an attack
        this.color = rrr;
      }
      if (!this.sliced) {
        context.fillStyle = this.makeGradient(
          (this.timeSpentOnScreen * (100 / timeUntilSliced)) / 100
        );
      }
    }
    const x = this.position.x;
    const y = this.position.y;
    context.moveTo(x - 5, y);
    context.lineTo(x - 5, y - this.height);
    context.lineTo(x, y - this.height - 10);
    context.lineTo(x + 5, y - this.height);
    context.lineTo(x + 5, y);
    context.lineTo(x - 5, y);
    context.fill();
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

  makeGradient(progressValue) {
    const first = this.position.x - this.width / 2;
    const second = this.position.y;
    const third = this.position.x + this.width / 2;
    const fourth = this.position.y - this.height - 10;
    const colorStopBeg = 0;
    let colorStopMid = progressValue > 1.0 ? 1.0 : progressValue;
    const colorStopEnd = 1.0;
    const gradient = context.createLinearGradient(first, second, third, fourth);
    gradient.addColorStop(colorStopBeg, this.color);
    gradient.addColorStop(colorStopMid, this.color);
    gradient.addColorStop(colorStopMid, this.collidingColor);
    gradient.addColorStop(colorStopEnd, this.collidingColor);
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

  determineTimeSpentColliding() {
    if (this.isColliding) {
      this.timeSpentColliding++;
    }
  }
}

const ps = new PlayerSword();

/**
 * Used by event listeners directly below.
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

const enemySwordLocation = getRandomLocation();
class EnemySword extends Sword {
  constructor(parried = false, slicing = false) {
    super({
      position: { x: enemySwordLocation.x, y: enemySwordLocation.y },
      color: red,
      defaultColor: red,
      collidingColor: gry,
    });
    this.parried = parried;
    this.slicing = slicing;
  }

  handleSlice() {
    if (this.timeSpentOnScreen >= timeUntilSliced) {
      this.slicing = true;

      if (tick % 50 === 0) {
        changeScore(90, false);
        this.slicing = false;
        this.sliced = true;
        zzfx(
          ...[
            ,
            ,
            1000,
            0.02,
            0.1,
            0.12,
            1,
            1.78,
            -9.5,
            0.2,
            ,
            ,
            ,
            0.1,
            ,
            ,
            ,
            0.47,
            0.02,
            0.06,
          ]
        ); // Pickup 101
      }
    }
  }

  handleParry() {
    if (this.timeSpentColliding >= timeUntilParried) {
      const addedScore =
        90 - Math.abs(90 - Math.abs(this.rotationAngle - ps.rotationAngle));
      changeScore(addedScore, true);
      this.parried = true;
      activeCollisionHappening = false;
      zzfx(
        ...[
          ,
          ,
          1300,
          0.02,
          0.1,
          0.12,
          1,
          1.78,
          -9.5,
          0.2,
          ,
          ,
          ,
          0.1,
          ,
          ,
          ,
          0.47,
          0.02,
          0.06,
        ]
      ); // Pickup 101
    }
    if (this.isColliding) {
      this.timeSpentColliding++;
      activeCollisionHappening = true;
    } else {
      this.timeSpentOnScreen++;
      if (this.timeSpentColliding > 0) this.timeSpentColliding--;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                             Game State                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

//const enemyPatterns = ['peasant', 'barbarian', 'dual wielder', 'duelist', 'paladin', 'crusader'];
/**
 * 0 - peasant (random)
 * 1 - barbarian (straight line attacks)
 * 2 - dual wielder (close by attacks)
 * 3 - duelist (up and down with opposite angles)
 * 4 - paladin/high-int barb (straight line attacks but random angles)
 * 5 - crusader (far away attacks)
 */
let enemyState = -1;
let gameState = false;
let pushedSwords = 0;

function changeToInfoState() {
  if (enemyState === -1) {
    ne.style.display = 'none';
  }
  handleInfoChange();
}

function stopGameLoop() {
  cancelAnimationFrame(requestId);
  gameState = false;
}

function handleInfoChange() {
  stopGameLoop();
  enemyState += 1;
  info.style.display = 'flex';
  nextEnemy.textContent = ENEMIES[enemyState].name;
  nextEnemyDescription.textContent = ENEMIES[enemyState].description;
  go.textContent = ENEMIES[enemyState].button;
}

function changeToGameState() {
  pushedSwords = 0;
  activeSwords.length = 0;
  activeSwords.push(ps);
  info.style.display = 'none';
  gameState = true;
  requestId = requestAnimationFrame(gameLoop);
}

go.onclick = () => {
  if (gameState < ENEMIES.length - 1) changeToGameState();
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Enemy Patterns                                         //
//////////////////////////////////////////////////////////////////////////////////////////////////////

function peasant() {
  if (pushedSwords < 5) {
    pushSword(300, 100, 600, 100, 400, Math.random() > 0.5 ? 90 : 0);
  } else if (pushedSwords < 10) {
    pushSword(150, 100, 600, 100, 400, getRandomInt(0, 359));
  } else {
    changeToInfoState();
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
  } else {
    if (tick % 200 === 0) {
      changeToInfoState();
    }
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
  } else {
    if (tick % 200 === 0) {
      changeToInfoState();
    }
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
  } else {
    if (tick % 200 === 0) {
      changeToInfoState();
    }
  }
}

// TODO: NOT WORKING YET :D
function dualWielder() {
  if (pushedSwords < 16) {
    let angle, x1, x2, y1, y2;
    // let angle = getRandomInt(-90, 90);
    // let x1 = getRandomInt(100, 600);
    // let x2 = x1 + angle;
    // let y1 = getRandomInt(200, 400);
    // let y2 = y1 - 90 - angle;
    if (pushedSwords % 2 === 0) {
      angle = getRandomInt(-90, 90);
      x1 = getRandomInt(100, 600);
      x2 = x2 = x1 + angle / 4;
      y1 = getRandomInt(200, 400);
      y2 = y1 + Math.abs(90 - angle / 4);
    }
    console.log(angle);
    pushSword(100, x1, x1, y1, y1, angle);
    pushSword(100, x2, x2, y2, y2, angle);
  }
}

function crusader() {}

const ENEMIES = [
  {
    name: 'Welcome!',
    description:
      'Move your sword with the mouse. Rotate with Q or E. Block enemy attacks by intersecting enemy sword. Try to get opposite angles (i.e. make a cross or x shape) for maximum score',
    button: 'Start',
    fx: peasant,
  },
  {
    name: 'Barbarian',
    description:
      'Quick, but dumb. Try to rack up a high score with their predictable attacks.',
    button: "I'm barbarian to it",
    fx: barbarian,
  },
  {
    name: 'Duelist',
    description:
      'A skilled combatant. Try to keep up with their precise attacks. En garde!',
    button: "Let's duel it",
    fx: duelist,
  },
  {
    name: 'Paladin',
    description: 'High-INT barbarian',
    button: "I'm paladin to it",
    fx: paladin,
  },
  {
    //TODO: Detemrine if you want this
    name: 'Thanks for playing!',
    description: `Final score: ${score}`,
    button: 'Go back to JS13K Games',
    fx: goodbye,
  },
];

function goodbye() {
  window.location.replace('https://js13kgames.com/'); //TODO: Does this work? lol
}

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
    zzfx(
      ...[
        ,
        ,
        90,
        0.02,
        0.06,
        0.07,
        1,
        0.13,
        ,
        ,
        ,
        ,
        ,
        0.2,
        ,
        0.3,
        ,
        0.91,
        0.08,
        0.15,
      ]
    ); // Hit 110
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
  let topRight = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x + sword.width,
    sword.position.y,
    sword.rotationAngle
  );
  let bottomLeft = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x,
    sword.position.y + sword.height,
    sword.rotationAngle
  );
  let bottomRight = rotatedCoordinatesHelper(
    centerX,
    centerY,
    sword.position.x + sword.width / 2,
    sword.position.y + sword.height,
    sword.rotationAngle
  );
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
  let perpendicularLine = null;
  // https://en.wikipedia.org/wiki/Dot_product
  let dot = 0;
  let perpendicularStack = [];
  let amin = null;
  let amax = null;
  let bmin = null;
  let bmax = null;
  //Get all perpendicular vectors on each edge for polygonA
  for (let i = 0; i < polygonA.edge.length; i++) {
    perpendicularLine = new xy(-polygonA.edge[i].y, polygonA.edge[i].x);
    perpendicularStack.push(perpendicularLine);
  }
  //Get all perpendicular vectors on each edge for polygonB
  for (let i = 0; i < polygonB.edge.length; i++) {
    perpendicularLine = new xy(-polygonB.edge[i].y, polygonB.edge[i].x);
    perpendicularStack.push(perpendicularLine);
  }
  //Loop through each perpendicular vector for both polygons
  for (let i = 0; i < perpendicularStack.length; i++) {
    //These dot products will return different values each time
    amin = null;
    amax = null;
    bmin = null;
    bmax = null;
    // Work out all of the dot products for all of the vertices in PolygonA against the perpendicular vector that is currently being looped through
    for (let j = 0; j < polygonA.vertex.length; j++) {
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
    for (let j = 0; j < polygonB.vertex.length; j++) {
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
  if (thisSword.slicing) return;
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
    playerSword.isColliding = true;
    playerSword.timeSpentColliding = thisSword.timeSpentColliding;

    // thisSword.color = thisSword.collidingColor;
  } else {
    thisSword.isColliding = false;
    playerSword.isColliding = false;
    thisSword.color = thisSword.defaultColor;

    //Below covers the case of two swords with rotationAngle 0
    if (thisSword.rotationAngle === 0 && playerSword.rotationAngle === 0) {
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
  return { x: randomX, y: randomY };
}

/**
 * Takes a number and boolean (true +, false -).
 * Updates score, roundScore, and HTML accordingly.
 *
 * @param {number} newPoints
 * @param {boolean} isPositive
 */
function changeScore(newPoints, isPositive) {
  if (isPositive) {
    score += newPoints;
    roundScore += newPoints;
  } else {
    score -= newPoints;
    roundScore -= newPoints;
  }
  scoreBoard.textContent = score;
}

// ZzFXMicro - Zuper Zmall Zound Zynth - v1.2.0 by Frank Force ~ 880 bytes
zzfxV = 0.3; // volume
zzfx = // play sound
  (
    p = 1,
    k = 0.05,
    b = 220,
    e = 0,
    r = 0,
    t = 0.1,
    q = 0,
    D = 1,
    u = 0,
    y = 0,
    v = 0,
    z = 0,
    l = 0,
    E = 0,
    A = 0,
    F = 0,
    c = 0,
    w = 1,
    m = 0,
    B = 0,
    M = Math,
    R = 44100,
    d = 2 * M.PI,
    G = (u *= (500 * d) / R / R),
    C = (b *= ((1 - k + 2 * k * M.random((k = []))) * d) / R),
    g = 0,
    H = 0,
    a = 0,
    n = 1,
    I = 0,
    J = 0,
    f = 0,
    x,
    h
  ) => {
    e = R * e + 9;
    m *= R;
    r *= R;
    t *= R;
    c *= R;
    y *= (500 * d) / R ** 3;
    A *= d / R;
    v *= d / R;
    z *= R;
    l = (R * l) | 0;
    for (h = (e + m + r + t + c) | 0; a < h; k[a++] = f)
      ++J % ((100 * F) | 0) ||
        ((f = q
          ? 1 < q
            ? 2 < q
              ? 3 < q
                ? M.sin((g % d) ** 3)
                : M.max(M.min(M.tan(g), 1), -1)
              : 1 - (((((2 * g) / d) % 2) + 2) % 2)
            : 1 - 4 * M.abs(M.round(g / d) - g / d)
          : M.sin(g)),
        (f =
          (l ? 1 - B + B * M.sin((d * a) / l) : 1) *
          (0 < f ? 1 : -1) *
          M.abs(f) ** D *
          zzfxV *
          p *
          (a < e
            ? a / e
            : a < e + m
            ? 1 - ((a - e) / m) * (1 - w)
            : a < e + m + r
            ? w
            : a < h - c
            ? ((h - a - c) / t) * w
            : 0)),
        (f = c
          ? f / 2 +
            (c > a ? 0 : ((a < h - c ? 1 : (h - a) / c) * k[(a - c) | 0]) / 2)
          : f)),
        (x = (b += u += y) * M.cos(A * H++)),
        (g += x - x * E * (1 - ((1e9 * (M.sin(a) + 1)) % 2))),
        n && ++n > z && ((b += v), (C += v), (n = 0)),
        !l || ++I % l || ((b = C), (u = G), (n ||= 1));
    p = zzfxX.createBuffer(1, h, R);
    p.getChannelData(0).set(k);
    b = zzfxX.createBufferSource();
    b.buffer = p;
    b.connect(zzfxX.destination);
    b.start();
    return b;
  };
zzfxX = new AudioContext();

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                         Game Loop Stuff                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////

const activeSwords = [ps];

activeSwords.forEach((sword, index) => {
  detectRectangleCollision(index);
});

let requestId;

function gameLoop() {
  if (!gameState) return;
  tick++;
  context.clearRect(0, 0, canvas.width, canvas.height);
  ps.checkSwordRotation();
  ps.determineTimeSpentColliding();
  activeSwords.forEach((sword, index) => {
    if (index === 0 || sword.parried || sword.sliced) return;
    detectRectangleCollision(index);
    sword.drawRotation();
    sword.handleParry();
    sword.handleSlice();
  });
  ENEMIES[enemyState].fx();
  // peasant();
  // barbarian();
  // paladin();
  // duelist();
  // dualWielder();
  requestId = requestAnimationFrame(gameLoop);
}

changeToInfoState();
