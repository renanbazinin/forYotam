/*****************************************************
 * DOM References
 *****************************************************/
const canvas = document.getElementById('canvas');
const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const gifResult = document.getElementById('gifResult');

const ctx = canvas.getContext('2d');

/*****************************************************
 * State Variables
 *****************************************************/
// Mediapipe
let faceMesh = null;
let camera = null;

// Face detection & capturing flow
let faceDetected = false;    // True once a face is detected
let countdownStarted = false;
let faceCaptured = false;    // True after we capture a set of snapshots
let snapshots = [];          // Stores the current set of captured frames

// Overlay text displayed on the canvas
let overlayText = 'No face detected';

/*****************************************************
 * 1. Initialize Mediapipe FaceMesh
 *****************************************************/
function initFaceMesh() {
  faceMesh = new FaceMesh({
    locateFile: (file) => {
      // Use the JSDelivr CDN for FaceMesh assets
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  // Handle results for every processed frame
  faceMesh.onResults(onResults);
}

/*****************************************************
 * 2. onResults - Called each time FaceMesh processes a frame
 *****************************************************/
function onResults(results) {
  // Draw the live video onto our canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const faceCount = results.multiFaceLandmarks.length;

  // If no face found...
  if (faceCount === 0) {
    // Only show "No face detected" if we haven't started countdown or finished capturing
    if (!countdownStarted && !faceCaptured) {
      faceDetected = false;
      overlayText = 'No face detected';
    }
  } 
  // If a face is found...
  else {
    // If we haven't detected a face yet and haven't started or finished capturing:
    if (!faceDetected && !countdownStarted && !faceCaptured) {
      faceDetected = true;
      console.log('Face detected!');
      startCountdown();
    }
  }

  // Draw overlay text
  drawOverlayText(overlayText);
}

/*****************************************************
 * 3. Start the Camera using the Mediapipe Camera utility
 *****************************************************/
function startCamera() {
  // Reset our state each time we start
  faceDetected = false;
  countdownStarted = false;
  faceCaptured = false;
  snapshots = [];
  overlayText = 'No face detected';

  gifResult.innerHTML = '';

  camera = new Camera(video, {
    onFrame: async () => {
      // Process each frame through FaceMesh
      await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
}

/*****************************************************
 * 4. Start the Countdown: "2", "1", "Go!"
 *****************************************************/
function startCountdown() {
  countdownStarted = true;
  const countdownMessages = ['2', '1', 'Go!'];
  let index = 0;

  // Show the first message immediately
  overlayText = countdownMessages[index];
  console.log(`Countdown: ${overlayText}`);

  const countdownInterval = setInterval(() => {
    index++;
    if (index < countdownMessages.length) {
      overlayText = countdownMessages[index];
      console.log(`Countdown: ${overlayText}`);
    } else {
      // Done counting, clear text & capture photos
      clearInterval(countdownInterval);
      overlayText = ''; 
      capturePhotos();
    }
  }, 1000);
}

/*****************************************************
 * 5. Capture 3 Photos, 0.5s Apart
 *****************************************************/
function capturePhotos() {
  let shotsTaken = 0;
  const totalShots = 3;
  snapshots = []; // Clear any old snapshots

  const shotInterval = setInterval(() => {
    // Draw current video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    const dataURL = canvas.toDataURL('image/png');
    snapshots.push(dataURL);

    shotsTaken++;
    console.log(`Captured photo #${shotsTaken}`);

    if (shotsTaken === totalShots) {
      clearInterval(shotInterval);
      faceCaptured = true;
      // Display "gif-like" frames
      displayGifLikeAnimation(snapshots);
    }
  }, 500);
}

/*****************************************************
 * 6. Display "GIF-like" Animation
 *    We'll create a new container each time 
 *    so multiple results accumulate below.
 *****************************************************/
function displayGifLikeAnimation(frames) {
  if (frames.length < 3) {
    overlayText = 'Not enough frames.';
    return;
  }

  // Create a container for this "GIF" item
  const gifItem = document.createElement('div');
  gifItem.className = 'gif-item';

  // Create <img> that we'll flip among frames
  const animationImg = document.createElement('img');
  animationImg.width = 320;
  animationImg.height = 240;

  gifItem.appendChild(animationImg);
  gifResult.appendChild(gifItem);

  // Animate frame flipping
  let index = 0;
  setInterval(() => {
    animationImg.src = frames[index];
    index = (index + 1) % frames.length;
  }, 200);

  // After we've displayed the new GIF,
  // show "Looking for face..." for 1 second,
  // then let detection run again.
  setTimeout(() => {
    overlayText = 'Looking for face...';
    drawOverlayText(overlayText);
    
    setTimeout(() => {
      overlayText = '';
      // Reset states so we can detect a new face.
      faceDetected = false;
      countdownStarted = false;
      faceCaptured = false;
      snapshots = [];
    }, 1000);
  }, 0);
}

/*****************************************************
 * 7. Utility: Draw Overlay Text on Canvas
 *****************************************************/
function drawOverlayText(text) {
  if (!text) return;
  ctx.save();
  ctx.font = '40px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, 80);
  ctx.restore();
}

/*****************************************************
 * 8. On Page Load
 *****************************************************/
window.addEventListener('DOMContentLoaded', () => {
  initFaceMesh();

  startBtn.addEventListener('click', () => {
    startCamera();
  });
});
