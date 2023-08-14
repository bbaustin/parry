/////////////
// Arena  //
////////////
const arena = document.getElementById('arena');

///////////////////
// Player Sword //
//////////////////
const sword = document.getElementsByClassName('sword')[0];

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

/////////////////
// Enemy Sword //
////////////////

///////////////
// Game Loop //
///////////////
var keyState = {
  q: false,
  e: false,
};
document.addEventListener('keydown', (event) => {
  if (event.key === 'q') {
    keyState.q = true;
  }
  // Increase angle to rotate right
  else if (event.key === 'e') {
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
let rotationAngle = 0;
function gameLoop() {
  console.log(rotationAngle);
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
  setTimeout(gameLoop, 10);
}

gameLoop();
