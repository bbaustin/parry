/////////////
// Arena  //
////////////
// const arena = document.getElementById('arena');
const arena = document.getElementById('canvas');
const context = canvas.getContext('2d');

///////////////////
// Player Sword //
//////////////////
const sword = document.getElementsByClassName('sword')[0];

// Move sword
document.addEventListener('mousemove', (event) => {
  // Update the follower's position to match the mouse cursor
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // Offset to center the follower under the cursor
  const xOffset = 0;
  const yOffset = -100;

  sword.style.left = mouseX + xOffset + 'px';
  sword.style.top = mouseY + yOffset + 'px';
});

// Rotation angle of sword
let rotationAngle = 0;

// State to change angle of sword in game loop
let keyState = {
  q: false,
  e: false,
};

// Change state when changing sword angle
document.addEventListener('keydown', (event) => {
  if (event.key === 'q') {
    keyState.q = true;
  } else if (event.key === 'e') {
    keyState.e = true;
  }
});
document.addEventListener('keyup', (event) => {
  if (event.key === 'q') {
    keyState.q = false;
  } else if (event.key === 'e') {
    keyState.e = false;
  }
});

// Rotate sword if state is true/active
function checkRotate() {
  if (keyState.q && rotationAngle >= -80) {
    // Decrease angle to rotate left
    rotationAngle -= 10;
    sword.style.transform = `rotate(${rotationAngle}deg)`;
  }
  // Increase angle to rotate right
  if (keyState.e && rotationAngle <= 80) {
    // Increase angle to rotate right
    rotationAngle += 10;
    sword.style.transform = `rotate(${rotationAngle}deg)`;
  }
}

/////////////////
// Enemy Sword //
////////////////
function createEnemySword() {
  const enemySword = document.createElement('div');
  const enemySwordRotation = `rotate(${getRandomInt(-90, 90)}deg)`;
  enemySword.classList.add('sword', 'enemy');
  enemySword.style.transform = enemySwordRotation;
  arena.appendChild(enemySword);
}
createEnemySword();
const enemySword = document.getElementsByClassName('enemy')[0];

///////////////////
// Intersection //
//////////////////

const checkIfIntersecting = (sword, enemySword) => {
  const swordBox = sword.getBoundingClientRect();
  const enemySwordBox = enemySword.getBoundingClientRect();

  return (
    swordBox.left < enemySwordBox.right &&
    swordBox.right > enemySwordBox.left &&
    swordBox.top < enemySwordBox.bottom &&
    swordBox.bottom > enemySwordBox.top
  );
};

// if (isIntersecting()) {
//   document.getElementById('intersect').textContent = 'hey yeh';
// }

///////////////
// Game Loop //
///////////////

function gameLoop() {
  checkRotate();
  const isIntersecting = checkIfIntersecting(sword, enemySword);
  if (isIntersecting) {
    console.log('ok');
    sword.style.background = 'pink';
  } else {
    sword.style.background = 'blue';
  }
  setTimeout(gameLoop, 10);
}

gameLoop();

///////////
// Utils //
///////////
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
