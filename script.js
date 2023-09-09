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
let isCollidingNow = false;
let parriedCount = 0;
// HTML stuff
const info = document.getElementById('info');
// Start buttons
const go = document.getElementById('go');
const goSound = document.getElementById('go-sound');
// Results Info
const roundInfo = document.getElementById('round-info');

//
const timeUntilParried = 33;
let hasSound = false;
const lastHighScore = localStorage.getItem('parryHighScore') || 0;

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                               Sword                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class Sword {
  constructor({
    position = { x: 0, y: 0 },
    color = gry,
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
    if (this.id < 50) {
      // only for PlayerSword
      if (isCollidingNow) {
        context.fillStyle = this.makeGradient(
          (this.timeSpentColliding * (100 / timeUntilParried)) / 100
        );
      } else {
        context.fillStyle = this.color;
      }
    } else {
      // only for enemy sword
      if (this.slicing) {
        this.color = rrr;
      }
      if (!this.sliced) {
        context.fillStyle = this.makeGradient(
          (this.timeSpentOnScreen * (100 / this.timeUntilSliced)) / 100
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
    let colorStopMid = progressValue > 1.0 ? 1.0 : progressValue;
    const gradient = context.createLinearGradient(
      this.position.x - this.width / 2,
      this.position.y,
      this.position.x + this.width / 2,
      this.position.y - this.height - 10
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(colorStopMid, this.color);
    gradient.addColorStop(colorStopMid, this.collidingColor);
    gradient.addColorStop(1, this.collidingColor);
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
const enemySwordLocation = getRandomConstrainedLocation(100, 600, 100, 400);

class EnemySword extends Sword {
  constructor(parried = false, slicing = false, timeUntilSliced = 75) {
    super({
      position: { x: enemySwordLocation.x, y: enemySwordLocation.y },
      color: red,
      collidingColor: gry,
    });
    this.parried = parried;
    this.slicing = slicing;
    this.timeUntilSliced = timeUntilSliced;
  }

  handleSlice() {
    if (this.timeSpentOnScreen >= this.timeUntilSliced) {
      this.slicing = true;

      if (tick % 50 === 0) {
        changeScore(90, false);
        this.slicing = false;
        this.sliced = true;
        if (hasSound) {
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
  }

  handleParry() {
    if (this.timeSpentColliding >= timeUntilParried) {
      const addedScore = calculatePoints(this.rotationAngle, ps.rotationAngle);
      changeScore(addedScore, true);
      this.parried = true;
      parriedCount++;
      isCollidingNow = false;
      if (hasSound) {
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
    }
    if (this.isColliding) {
      this.timeSpentColliding++;
      isCollidingNow = true;
    } else {
      this.timeSpentOnScreen++;
      if (this.timeSpentColliding > 0) this.timeSpentColliding--;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                             Game State                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

let enemyState = -1;
let gameState = false;
let numEs = 0;

function changeToInfoState() {
  if (enemyState > -1) goSound.style.display = 'none';

  roundInfo.style.display = 'block';
  handleInfoChange();
}

function stopGameLoop() {
  cancelAnimationFrame(requestId);
  gameState = false;
}

function handleInfoChange() {
  stopGameLoop();
  // first update score stuff
  if (enemyState > -1) {
    let numAttacks = ENEMIES[enemyState].numberOfAttacks;
    document.getElementById('rating').textContent =
      determineRoundRating(numAttacks);
    document.getElementById('score-percent').textContent = Math.max(
      Math.round((roundScore / (numAttacks * 100)) * 100),
      0
    );
    document.getElementById('your-score').textContent = roundScore;
    document.getElementById('possible-score').textContent = 100 * numAttacks;
  } else {
    roundInfo.style.display = 'none';
  }
  //then update enemy stuff
  enemyState += 1;
  info.style.display = 'flex';
  if (enemyState === ENEMIES.length) {
    document.getElementById('last-info').style.display = 'flex';
    document.getElementById('enemy-info').style.display = 'none';

    updateLocalStorage();
  } else {
    document.getElementById('next-enemy').textContent =
      ENEMIES[enemyState].name;
    go.textContent = ENEMIES[enemyState].button;
  }
}

function updateLocalStorage() {
  if (score > lastHighScore) {
    localStorage.setItem('parryHighScore', score);
    document.getElementById('new-high-score').style.display = 'block';
  }
  document.getElementById('high-score').textContent =
    localStorage.getItem('parryHighScore');
}

function determineRoundRating(numAttacks) {
  const grades = [
    'Parrylously bad.',
    'Perrible...',
    'Not up to par(ry).',
    'Not parryticularly notable.',
    'Somewhat imparryssive...',
    'Parretty good...',
    'Parry good!',
    'Extraordinparry!',
    'Legendparry!',
  ];
  for (let i = 1; i <= grades.length; i++) {
    if (roundScore <= numAttacks * 100 * (i / grades.length))
      return grades[i - 1];
  }
}

function changeToGameState() {
  parriedCount = 0;
  roundScore = 0;
  numEs = 0;
  activeSwords.length = 0;
  activeSwords.push(ps);
  info.style.display = 'none';
  gameState = true;
  requestId = requestAnimationFrame(gameLoop);
}

go.onclick = () => {
  if (gameState < ENEMIES.length - 1) changeToGameState();
};

goSound.onclick = () => {
  changeToGameState();
  zzfxX = new AudioContext();
  hasSound = true;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Enemy Patterns                                         //
//////////////////////////////////////////////////////////////////////////////////////////////////////

function peasant() {
  if (numEs < 5) {
    pushSword(250, 100, 600, 100, 400, Math.random() > 0.5 ? 0 : 90);
  } else if (numEs < 10) {
    pushSword(100, 100, 600, 100, 400, getRandomInt(0, 359));
  } else {
    transitionToNextStage(375);
  }
}

function bpal() {
  // true is barb. false is paladin.
  const b = enemyState == 1 ? 1 : 0;
  const x = (numEs % 4) * 150 + 100;
  let angle = b ? 90 : getRandomInt(0, 359);
  if (numEs < 16) {
    if (numEs < 4) y = 110;
    else if (numEs < 8) {
      y = 220;
      angle = b ? 0 : angle;
    } else if (numEs < 12) y = 330;
    else if (numEs < 16) {
      y = 440;
      angle = b ? 90 : getRandomInt(-100, 100);
    }
    pushSword(50, x, x, y, y, angle);
  } else {
    transitionToNextStage();
  }
}

function duelist() {
  const y = [100, 225, 350, 475];
  let x;

  if (numEs < 16) {
    if (numEs < 4) {
      x = 150;
    } else if (numEs < 8) {
      x = 600;
    } else if (numEs < 12) {
      x = 300;
    } else if (numEs < 16) {
      x = 500;
    }
    pushSword(
      50,
      numEs % 2 === 0 ? x : x - 45,
      numEs % 2 === 0 ? x : x - 45,
      y[numEs % 4],
      y[numEs % 4],
      numEs % 2 === 0 ? -45 : 45
    );
  } else {
    transitionToNextStage(700);
  }
}

let lastComboIndex;
function archer() {
  const combos = [
    {
      x: 25,
      y: 100,
      a: 45,
    },
    {
      x: 675,
      y: 100,
      a: -45,
    },
    {
      x: 100,
      y: 475,
      a: -45,
    },
    {
      x: 600,
      y: 475,
      a: 45,
    },
  ];
  let combo, randomIndex;
  if (numEs < 10) {
    if (tick % 75 === 0) {
      randomIndex = getRandomInt(0, 3);
      if (randomIndex === lastComboIndex) {
        if (lastComboIndex === combos.length - 1) {
          randomIndex = 0;
        } else {
          randomIndex = lastComboIndex + 1;
        }
      }
      combo = combos[randomIndex];
      lastComboIndex = randomIndex;
      pushSword(1, combo.x, combo.x, combo.y, combo.y, combo.a);
    }
  } else if (numEs < 26) {
    if (tick % 150 === 0) {
      let r1 = getRandomInt(0, 3);
      let r2 = getRandomInt(0, 3);
      while (r1 === r2) {
        r2 = getRandomInt(0, 3);
      }
      pushSword(
        1,
        combos[r1].x,
        combos[r1].x,
        combos[r1].y,
        combos[r1].y,
        combos[r1].a,
        125
      );
      pushSword(
        1,
        combos[r2].x,
        combos[r2].x,
        combos[r2].y,
        combos[r2].y,
        combos[r2].a,
        125,
        false
      );
    }
  } else {
    transitionToNextStage(666);
  }
}

function dualWielder() {
  if (numEs < 32) {
    const x1 = getRandomInt(75, 600);
    const y1 = getRandomInt(100, 475);
    const combos = [
      { angle: 0, x2a: 30, y2a: 0 },
      {
        angle: 90,
        x2a: 0,
        y2a: -30,
      },
      {
        angle: 45,
        x2a: 20,
        y2a: 20,
      },
    ];
    const index = Math.floor(Math.random() * combos.length);
    let x2 = x1 + combos[index].x2a;
    let y2 = y1 + combos[index].y2a;
    pushSword(75, x1, x1, y1, y1, combos[index].angle, 37);
    pushSword(75, x2, x2, y2, y2, combos[index].angle, 37, false);
  } else {
    transitionToNextStage(400);
  }
}

function transitionToNextStage(delay = 200) {
  if (tick % delay === 0) {
    changeToInfoState();
  }
}

const ENEMIES = [
  {
    name: 'Peasant',
    button: 'Start (without sound)',
    fx: peasant,
    numberOfAttacks: 10,
  },
  {
    name: 'Barbarian',
    button: "I'm barbarian to it",
    fx: bpal,
    numberOfAttacks: 16,
  },
  {
    name: 'Paladin',
    button: "I'm paladin to it",
    fx: bpal,
    numberOfAttacks: 16,
  },
  {
    name: 'Archer',
    button: 'Ready, set, bow',
    fx: archer,
    numberOfAttacks: 26,
  },
  {
    name: 'Duelist',
    button: "Let's duel it",
    fx: duelist,
    numberOfAttacks: 16,
  },
  {
    name: 'Dual Wielder',
    button: "Let's dual it",
    fx: dualWielder,
    numberOfAttacks: 32,
  },
];

/////////////////
// Enemy Utils //
////////////////

function pushSword(
  msDelay,
  x1,
  x2,
  y1,
  y2,
  angle,
  sliceTime = 75,
  shouldPlaySound = true
) {
  if (tick % msDelay === 0) {
    const newEs = new EnemySword();
    newEs.position = getRandomConstrainedLocation(x1, x2, y1, y2);
    newEs.rotationAngle = angle;
    newEs.timeUntilSliced = sliceTime;
    activeSwords.push(newEs);
    if (hasSound && shouldPlaySound) {
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
    }
    numEs++;
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

// NOTE: Should adjust this to include all 5 vertices. But it's fine as-is
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
  } else {
    thisSword.isColliding = false;
    playerSword.isColliding = false;
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

function getRandomConstrainedLocation(xMin, xMax, yMin, yMax) {
  const randomX = Math.random() * (xMax - xMin + 1) + xMin;
  const randomY = Math.random() * (yMax - yMin + 1) + yMin;
  return { x: randomX, y: randomY };
}

function calculatePoints(angle1, angle2) {
  // Calculate the absolute angle difference modulo 180 degrees
  const angleDifference = Math.abs(
    ((((angle1 - angle2 + 180) % 360) + 360) % 360) - 180
  );
  const points = Math.round(100 - (Math.abs(90 - angleDifference) / 90) * 100);
  // Ensure points are within the range of 0 to 100
  return Math.max(0, Math.min(100, points));
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
  document.getElementById('score').textContent = score;
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
  requestId = requestAnimationFrame(gameLoop);
}

changeToInfoState();
