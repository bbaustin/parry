//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                      Canvas and Global Stuff                                     //
//////////////////////////////////////////////////////////////////////////////////////////////////////
const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
let cvsPos = getPositionRelativeToCanvas(cvs);
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
let rndScr = 0; //roundScore
let isColNow = false; //isCollidingNow

const timeUntilParried = 33;
let hasSound = false;
const info = document.getElementById('info');
const go = document.getElementById('go');
const goSound = document.getElementById('go-sound');
const roundInfo = document.getElementById('round-info');

const lastHighScore = localStorage.getItem('parryHighScore') || 0;

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                               Sword                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class Sword {
  constructor({
    pos = { x: 0, y: 0 },
    color = gry,
    colCol = red, //collidingColor
    width = 10,
    height = 100,
    ra = 0, // rotationAngle
    isCol = false, // isColliding
    tsCol = 0, //timeSpentColliding
    tsOS = 0, // timeSpentOnScreen
    id = tick,
    sliced = false,
  }) {
    this.pos = pos;
    this.color = color;
    this.colCol = colCol;
    this.width = width;
    this.height = height;
    this.ra = ra;
    this.isCol = isCol;
    this.tsCol = tsCol;
    this.tsOS = tsOS;
    this.id = id;
    this.sliced = sliced;
  }

  draw() {
    ctx.beginPath();
    if (this.id < 50) {
      // only for PlayerSword
      if (isColNow) {
        ctx.fillStyle = this.makeGradient(
          (this.tsCol * (100 / timeUntilParried)) / 100
        );
      } else {
        ctx.fillStyle = this.color;
      }
    } else {
      // only for enemy sword
      if (this.slicing) {
        this.color = rrr;
      }
      if (!this.sliced) {
        ctx.fillStyle = this.makeGradient(
          (this.tsOS * (100 / this.timeUntilSliced)) / 100
        );
      }
    }
    const x = this.pos.x;
    const y = this.pos.y;
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x - 5, y - this.height);
    ctx.lineTo(x, y - this.height - 10);
    ctx.lineTo(x + 5, y - this.height);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x - 5, y);
    ctx.fill();
  }

  drawRotation() {
    // Save the ctx state before transformations
    ctx.save();
    // Apply rotation at the calculated center point
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate((this.ra * Math.PI) / 180);
    ctx.translate(-this.pos.x, -this.pos.y);
    this.draw();
    // Restore the original ctx state
    ctx.restore();
  }

  makeGradient(prog) {
    let mid = prog > 1.0 ? 1.0 : prog;
    const g = ctx.createLinearGradient(
      this.pos.x - this.width / 2,
      this.pos.y,
      this.pos.x + this.width / 2,
      this.pos.y - this.height - 10
    );
    g.addColorStop(0, this.color);
    g.addColorStop(mid, this.color);
    g.addColorStop(mid, this.colCol);
    g.addColorStop(1, this.colCol);
    return g;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                           Player Sword                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

class PlayerSword extends Sword {
  constructor() {
    super({
      pos: { x: mouseX, y: mouseY },
      color: blu,
      colCol: grn,
    });
  }

  checkSwordRotation() {
    // Why 9? The sword can rotate between -90 and 90 degrees.
    // I was moving the sword by 10 degrees, but that felt a bit fast. 5 degrees was a bit too slow. 9 degrees feels alright!
    // This also explains the 81 below (90 - 9 = 81).
    const angleInDegrees = 9;
    if (keyStateForPlayerSwordRotation.q && this.ra >= -81) {
      this.ra -= angleInDegrees;
    }
    if (keyStateForPlayerSwordRotation.e && this.ra <= 81) {
      this.ra += angleInDegrees;
    }
    this.drawRotation();
  }

  determineTSCol() {
    if (this.isCol) {
      this.tsCol++;
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
class EnemySword extends Sword {
  constructor(parried = false, slicing = false, timeUntilSliced = 75) {
    super({
      color: red,
      colCol: gry,
    });
    this.parried = parried;
    this.slicing = slicing;
    this.timeUntilSliced = timeUntilSliced;
  }

  handleSlice() {
    if (this.tsOS >= this.timeUntilSliced) {
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
    if (this.tsCol >= timeUntilParried) {
      const addedScore = calculatePoints(this.ra, ps.ra);
      changeScore(addedScore, true);
      this.parried = true;
      isColNow = false;
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
    if (this.isCol) {
      this.tsCol++;
      isColNow = true;
    } else {
      this.tsOS++;
      if (this.tsCol > 0) this.tsCol--;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                             Game State                                           //
//////////////////////////////////////////////////////////////////////////////////////////////////////

let enemyState = -1;
let gameState = false;
let numEs = 0;

function goInfo() {
  if (enemyState > -1) goSound.style.display = 'none';

  roundInfo.style.display = 'flex';
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
    let numAttacks = ENEMIES[enemyState].numAtt;
    document.getElementById('rating').textContent =
      determineRoundRating(numAttacks);
    document.getElementById('score-percent').textContent = Math.max(
      Math.round((rndScr / (numAttacks * 100)) * 100),
      0
    );
    document.getElementById('your-score').textContent = rndScr;
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
    if (rndScr <= numAttacks * 100 * (i / grades.length)) return grades[i - 1];
  }
}

function changeToGameState() {
  rndScr = 0;
  numEs = 0;
  actSw.length = 0;
  actSw.push(ps);
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
    pshSw(250, 100, 600, 100, 400, Math.random() > 0.5 ? 0 : 90);
  } else if (numEs < 10) {
    pshSw(100, 100, 600, 100, 400, ranInt(0, 359));
  } else {
    goNext(375);
  }
}

function bpal() {
  // true is barb. false is paladin.
  const b = enemyState == 1 ? 1 : 0;
  const x = (numEs % 4) * 150 + 100;
  let angle = b ? 90 : ranInt(0, 359);
  if (numEs < 16) {
    if (numEs < 4) y = 110;
    else if (numEs < 8) {
      y = 220;
      angle = b ? 0 : angle;
    } else if (numEs < 12) y = 330;
    else if (numEs < 16) {
      y = 440;
      angle = b ? 90 : ranInt(-100, 100);
    }
    pshSw(50, x, x, y, y, angle);
  } else {
    goNext();
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
    pshSw(
      50,
      numEs % 2 === 0 ? x : x - 45,
      numEs % 2 === 0 ? x : x - 45,
      y[numEs % 4],
      y[numEs % 4],
      numEs % 2 === 0 ? -45 : 45
    );
  } else {
    goNext(700);
  }
}

let lastCI;
function archer() {
  const cs = [
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
  let c, r;
  if (numEs < 10) {
    if (tick % 75 === 0) {
      r = ranInt(0, 3);
      if (r === lastCI) {
        if (lastCI === cs.length - 1) {
          r = 0;
        } else {
          r = lastCI + 1;
        }
      }
      c = cs[r];
      lastCI = r;
      pshSw(1, c.x, c.x, c.y, c.y, c.a);
    }
  } else if (numEs < 26) {
    if (tick % 150 === 0) {
      let r1 = ranInt(0, 3);
      let r2 = ranInt(0, 3);
      while (r1 === r2) {
        r2 = ranInt(0, 3);
      }
      pshSw(1, cs[r1].x, cs[r1].x, cs[r1].y, cs[r1].y, cs[r1].a, 125);
      pshSw(1, cs[r2].x, cs[r2].x, cs[r2].y, cs[r2].y, cs[r2].a, 125, false);
    }
  } else {
    goNext(666);
  }
}

function dualWielder() {
  if (numEs < 32) {
    const x1 = ranInt(75, 600);
    const y1 = ranInt(100, 475);
    const cs = [
      { a: 0, x2a: 30, y2a: 0 },
      {
        a: 90,
        x2a: 0,
        y2a: -30,
      },
      {
        a: 45,
        x2a: 20,
        y2a: 20,
      },
    ];
    const i = Math.floor(Math.random() * cs.length);
    let x2 = x1 + cs[i].x2a;
    let y2 = y1 + cs[i].y2a;
    pshSw(75, x1, x1, y1, y1, cs[i].a, 37);
    pshSw(75, x2, x2, y2, y2, cs[i].a, 37, false);
  } else {
    goNext(400);
  }
}

function goNext(delay = 200) {
  if (tick % delay === 0) {
    goInfo();
  }
}

const ENEMIES = [
  {
    name: 'Peasant',
    button: 'Start (without sound)',
    fx: peasant,
    numAtt: 10,
  },
  {
    name: 'Barbarian',
    button: "I'm barbarian to it",
    fx: bpal,
    numAtt: 16,
  },
  {
    name: 'Paladin',
    button: "I'm paladin to it",
    fx: bpal,
    numAtt: 16,
  },
  {
    name: 'Archer',
    button: 'Ready, set, bow',
    fx: archer,
    numAtt: 26,
  },
  {
    name: 'Duelist',
    button: "Let's duel it",
    fx: duelist,
    numAtt: 16,
  },
  {
    name: 'Dual Wielder',
    button: "Let's dual it",
    fx: dualWielder,
    numAtt: 32,
  },
];

/////////////////
// Enemy Utils //
////////////////

function pshSw(
  msDelay,
  x1,
  x2,
  y1,
  y2,
  angle,
  sliceTime = 75,
  wantSound = true
) {
  if (tick % msDelay === 0) {
    const newEs = new EnemySword();
    newEs.pos = getRanLoc(x1, x2, y1, y2);
    newEs.ra = angle;
    newEs.timeUntilSliced = sliceTime;
    actSw.push(newEs);
    if (hasSound && wantSound) {
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
function rch( //rotatedCoordinatesHelper
  cx, //center
  cy,
  vx, //vertex
  vy,
  ra
) {
  //Convert rotated angle into radians
  ra = (ra * Math.PI) / 180;
  let dx = vx - cx;
  let dy = vy - cy;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let ogAng = Math.atan2(dy, dx);

  let rotatedX = cx + dist * Math.cos(ogAng + ra);
  let rotatedY = cy + dist * Math.sin(ogAng + ra);

  return {
    x: rotatedX,
    y: rotatedY,
  };
}

//Get the rotated coordinates for the sword
function getRc(sw) {
  let cx = sw.pos.x + sw.width / 2;
  let cy = sw.pos.y + sw.height;
  let tL = rch(cx, cy, sw.pos.x, sw.pos.y, sw.ra);
  let tR = rch(cx, cy, sw.pos.x + sw.width, sw.pos.y, sw.ra);
  let bL = rch(cx, cy, sw.pos.x, sw.pos.y + sw.height, sw.ra);
  let bR = rch(cx, cy, sw.pos.x + sw.width / 2, sw.pos.y + sw.height, sw.ra);
  return {
    tL: tL, //topLeft
    tR: tR, //topRight
    bL: bL, //bottomLeft
    bR: bR, //bottomRight
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
function isCol(polygonA, polygonB) {
  let perpLine = null; //perpendicularLine
  // https://en.wikipedia.org/wiki/Dot_product
  let dot = 0;
  let perpStack = [];
  let amin = null;
  let amax = null;
  let bmin = null;
  let bmax = null;
  //Get all perpendicular vectors on each edge for polygonA
  for (let i = 0; i < polygonA.edge.length; i++) {
    perpLine = new xy(-polygonA.edge[i].y, polygonA.edge[i].x);
    perpStack.push(perpLine);
  }
  //Get all perpendicular vectors on each edge for polygonB
  for (let i = 0; i < polygonB.edge.length; i++) {
    perpLine = new xy(-polygonB.edge[i].y, polygonB.edge[i].x);
    perpStack.push(perpLine);
  }
  //Loop through each perpendicular vector for both polygons
  for (let i = 0; i < perpStack.length; i++) {
    //These dot products will return different values each time
    amin = null;
    amax = null;
    bmin = null;
    bmax = null;
    // Work out all of the dot products for all of the vertices in PolygonA against the perpendicular vector that is currently being looped through
    for (let j = 0; j < polygonA.vertex.length; j++) {
      dot =
        polygonA.vertex[j].x * perpStack[i].x +
        polygonA.vertex[j].y * perpStack[i].y;
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
        polygonB.vertex[j].x * perpStack[i].x +
        polygonB.vertex[j].y * perpStack[i].y;
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
  const ts = actSw[index]; //thisSword
  if (ts.slicing) return;
  const plyS = actSw[0]; //playerSword
  //Get rotated coordinates for both rectangles
  let tsrxy = getRc(ts); //thisSwordRotatedXY
  let psrxy = getRc(plyS); //playerSwordRotatedXY
  //Vertices & Edges are listed in clockwise order. Starting from the top right
  let thisSwordVertices = [
    new xy(tsrxy.tR.x, tsrxy.tR.y),
    new xy(tsrxy.bR.x, tsrxy.bR.y),
    new xy(tsrxy.bL.x, tsrxy.bL.y),
    new xy(tsrxy.tL.x, tsrxy.tL.y),
  ];
  let thisSwordEdges = [
    new xy(tsrxy.bR.x - tsrxy.tR.x, tsrxy.bR.y - tsrxy.tR.y),
    new xy(tsrxy.bL.x - tsrxy.bR.x, tsrxy.bL.y - tsrxy.bR.y),
    new xy(tsrxy.tL.x - tsrxy.bL.x, tsrxy.tL.y - tsrxy.bL.y),
    new xy(tsrxy.tR.x - tsrxy.tL.x, tsrxy.tR.y - tsrxy.tL.y),
  ];
  let playerSwordVertices = [
    new xy(psrxy.tR.x, psrxy.tR.y),
    new xy(psrxy.bR.x, psrxy.bR.y),
    new xy(psrxy.bL.x, psrxy.bL.y),
    new xy(psrxy.tL.x, psrxy.tL.y),
  ];
  let playerSwordEdges = [
    new xy(psrxy.bR.x - psrxy.tR.x, psrxy.bR.y - psrxy.tR.y),
    new xy(psrxy.bL.x - psrxy.bR.x, psrxy.bL.y - psrxy.bR.y),
    new xy(psrxy.tL.x - psrxy.bL.x, psrxy.tL.y - psrxy.bL.y),
    new xy(psrxy.tR.x - psrxy.tL.x, psrxy.tR.y - psrxy.tL.y),
  ];

  if (
    isCol(
      new polygon(thisSwordVertices, thisSwordEdges),
      new polygon(playerSwordVertices, playerSwordEdges)
    )
  ) {
    ts.isCol = true;
    plyS.isCol = true;
    plyS.tsCol = ts.tsCol;
  } else {
    ts.isCol = false;
    plyS.isCol = false;
    //Below covers the case of two swords with ra 0
    if (ts.ra === 0 && plyS.ra === 0) {
      if (
        !(
          ts.pos.x > plyS.pos.x + plyS.width ||
          ts.pos.x + ts.width < plyS.pos.x ||
          ts.pos.y > plyS.pos.y + plyS.height ||
          ts.pos.y + ts.height < plyS.pos.y
        )
      ) {
        ts.color = red;
      }
    }
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                              Utils                                               //
//////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Retrieves the pos of an element relative to the cvs.
 * For more information, see here and search for "getPosition": https://www.kirupa.com/cvs/follow_mouse_cursor.htm
 *
 * @param {HTMLElement} element - The element for which to calculate the pos.
 * @returns {{x: number, y: number}} The x and y coordinates of the element relative to the cvs.
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
 * Move sword with mouse, taking into account pos of cvs in window (cvsPos)
 */
function setMousePositionForPlayerSword(e) {
  mouseX = e.clientX - cvsPos.x;
  mouseY = e.clientY - cvsPos.y;
  ps.pos.x = mouseX;
  ps.pos.y = mouseY;
}
cvs.addEventListener('mousemove', setMousePositionForPlayerSword);

/**
 * Generates a random integer within the specified range.
 *
 * @param {number} min - The minimum value of the range (inclusive).
 * @param {number} max - The maximum value of the range (inclusive).
 * @returns {number} A random integer within the specified range.
 */
function ranInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRanLoc(xMin, xMax, yMin, yMax) {
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
 * Updates score, rndScr, and HTML accordingly.
 *
 * @param {number} newPoints
 * @param {boolean} isPositive
 */
function changeScore(newPoints, isPositive) {
  if (isPositive) {
    score += newPoints;
    rndScr += newPoints;
  } else {
    score -= newPoints;
    rndScr -= newPoints;
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

const actSw = [ps]; // activeSwords

actSw.forEach((sword, index) => {
  detectRectangleCollision(index);
});

let requestId;

function gameLoop() {
  if (!gameState) return;
  tick++;
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ps.checkSwordRotation();
  ps.determineTSCol();
  actSw.forEach((sword, index) => {
    if (index === 0 || sword.parried || sword.sliced) return;
    detectRectangleCollision(index);
    sword.drawRotation();
    sword.handleParry();
    sword.handleSlice();
  });
  ENEMIES[enemyState].fx();
  requestId = requestAnimationFrame(gameLoop);
}

goInfo();
