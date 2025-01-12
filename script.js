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

// Face Detection / Capturing
let faceDetected = false;
let countdownStarted = false;
let faceCaptured = false;        // Once we've captured photos, we won't do it again
let snapshots = [];

// UI overlay text
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

  // onResults is called each time FaceMesh finishes processing a frame
  faceMesh.onResults(onResults);
}

/*****************************************************
 * 2. onResults - Called when FaceMesh processes a frame
 *****************************************************/
function onResults(results) {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the video frame onto the canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Check if we found any face(s)
  const faceCount = results.multiFaceLandmarks.length;

  // If no face is found...
  if (faceCount === 0) {
    if (!countdownStarted && !faceCaptured) {
      faceDetected = false;
      overlayText = 'No face detected';
    }
  } 
  // If a face is found, trigger countdown if not already started
  else {
    if (!faceDetected && !countdownStarted && !faceCaptured) {
      faceDetected = true;
      startCountdown();
    }
  }

  // Draw overlay text
  drawOverlayText(overlayText);
}

/*****************************************************
 * 3. Start the Camera via Mediapipe
 *****************************************************/
function startCamera() {
  faceDetected = false;
  countdownStarted = false;
  faceCaptured = false;
  snapshots = [];
  overlayText = 'No face detected';
  gifResult.innerHTML = '';

  // Initialize Mediapipe camera
  camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
}

/*****************************************************
 * 4. Start the "2, 1, Go!" Countdown
 *****************************************************/
function startCountdown() {
  countdownStarted = true;
  // We'll cycle through messages ["2", "1", "Go!"]
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
      // Countdown finished, capture photos
      clearInterval(countdownInterval);
      overlayText = ''; // Clear the text (or leave "Go!" while capturing)
      capturePhotos();
    }
  }, 1000); // 1 second per step
}

/*****************************************************
 * 5. Capture 3 Photos, 0.5s Apart
 *****************************************************/
function capturePhotos() {
  let shotsTaken = 0;
  const totalShots = 3;
  const shotInterval = setInterval(() => {
    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    const dataURL = canvas.toDataURL('image/png');
    snapshots.push(dataURL);

    shotsTaken++;
    console.log(`Captured photo #${shotsTaken}`);

    if (shotsTaken === totalShots) {
      clearInterval(shotInterval);
      faceCaptured = true; // Mark that we've done the capturing
      displayGifLikeAnimation();
    }
  }, 500);
}

/*****************************************************
 * 6. Display "GIF-like" Animation
 *****************************************************/
function displayGifLikeAnimation() {
  if (snapshots.length < 3) {
    gifResult.textContent = 'Not enough frames.';
    return;
  }

  // Create an <img> to cycle through the snapshots
  const animationImg = document.createElement('img');
  animationImg.width = 320;
  animationImg.height = 240;
  gifResult.appendChild(animationImg);

  let index = 0;
  setInterval(() => {
    animationImg.src = snapshots[index];
    index = (index + 1) % snapshots.length;
  }, 200); // flip frames every 0.2s
}

/*****************************************************
 * 7. Draw Overlay Text on Canvas
 *****************************************************/
function drawOverlayText(text) {
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
  startBtn.addEventListener('click', startCamera);
});
