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

let rotationAngle = 0;

document.addEventListener('keydown', (event) => {
  if (event.key === 'q' && rotationAngle >= -75) {
    rotationAngle -= 15; // Decrease angle to rotate left
    sword.style.transform = `rotate(${rotationAngle}deg)`;
  } else if (event.key === 'e' && rotationAngle <= 75) {
    rotationAngle += 15; // Increase angle to rotate right
    sword.style.transform = `rotate(${rotationAngle}deg)`;
  }
});

/////////////////
// Enemy Sword //
////////////////
