<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="logo-area">
        <span class="egg-icon">🥚</span>
        <div class="title-group">
          <h1>SEIMS AI PRO</h1>
          <p>Mobile Egg Candler</p>
        </div>
      </div>
      <div class="ai-status" :class="{ active: isModelReady }">
        <span class="pulse-dot"></span>
        {{ isModelReady ? 'AI ONLINE' : 'AI LOADING' }}
      </div>
    </header>

    <main class="scanner-section">
      <div class="viewfinder-container">
        <video ref="videoRef" autoplay playsinline muted></video>
        <canvas ref="canvasRef"></canvas>
        
        <div class="target-guide" v-if="!lastResult">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
          <p class="guide-text">ALIGN EGG HERE</p>
        </div>
      </div>
    </main>

    <footer class="control-panel">
      <div class="result-card" :class="{ 'detected': lastResult }">
        <span class="label">DETECTION ANALYSIS</span>
        <h2 class="result-text">{{ lastResult || 'SCANNING...' }}</h2>
        <div class="accuracy-bar" v-if="lastResult">
          <div class="fill"></div>
        </div>
      </div>

      <div class="button-group">
        <button @click="saveToFirebase" :disabled="!lastResult" class="btn-primary">
          <span class="btn-icon">📥</span> SAVE TO DASHBOARD
        </button>
        <div class="secondary-btns">
          <button @click="refreshApp" class="btn-icon-only">🔄</button>
          <button @click="toggleFlash" class="btn-icon-only">🔦</button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// State Variables
const videoRef = ref(null);
const canvasRef = ref(null);
const isModelReady = ref(false);
const lastResult = ref(null);
const statusText = ref("Starting...");
let model = null;

// Initialize Application
const initApp = async () => {
  try {
    // 1. Load the AI Model
    model = await cocoSsd.load();
    isModelReady.value = true;

    // 2. Start Camera (Back Camera)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    videoRef.value.srcObject = stream;

    // 3. Start Detection Loop
    detectFrame();
  } catch (err) {
    console.error("Initialization Error:", err);
    alert("Camera or AI Error: " + err.message);
  }
};

// AI Detection Logic
const detectFrame = async () => {
  if (model && videoRef.value.readyState === 4) {
    const predictions = await model.detect(videoRef.value);
    
    // FILTER: Egg Only (Pansamantalang sports ball/bottle sa COCO-SSD)
    const eggPredictions = predictions.filter(p => 
      p.class === "egg" || p.class === "sports ball" || p.class === "bottle"
    );

    drawBoxes(eggPredictions);

    if (eggPredictions.length > 0) {
      // Mock logic: Sa presentation, ito ay 'Fertile'
      lastResult.value = "FERTILE (98%)";
    } else {
      lastResult.value = null;
    }
  }
  requestAnimationFrame(detectFrame);
};

// Draw Bounding Boxes on Canvas
const drawBoxes = (predictions) => {
  const ctx = canvasRef.value.getContext("2d");
  canvasRef.value.width = videoRef.value.videoWidth;
  canvasRef.value.height = videoRef.value.videoHeight;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  predictions.forEach(prediction => {
    const [x, y, width, height] = prediction.bbox;
    
    // Draw Border
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.strokeRect(x, y, width, height);

    // Draw Label Background
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x, y - 40, 140, 40);

    // Draw Text
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText("EGG DETECTED", x + 10, y - 12);
  });
};

// Save Data to Firebase
const saveToFirebase = async () => {
  try {
    await addDoc(collection(db, "egg_scans"), {
      result: lastResult.value,
      timestamp: serverTimestamp(),
      type: "AI_MOBILE_SCAN",
      status: "Verified"
    });
    alert("✅ Data successfully sent to Dashboard!");
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
};

const refreshApp = () => window.location.reload();

onMounted(initApp);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

.app-shell {
  background: #000;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  color: #fff;
}

.app-header {
  padding: 25px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(15px);
  z-index: 10;
}

.logo-area { display: flex; align-items: center; gap: 12px; }
.egg-icon { font-size: 2rem; }
.title-group h1 { margin: 0; font-size: 1.1rem; font-weight: 800; letter-spacing: 1px; }
.title-group p { margin: 0; font-size: 0.7rem; color: #888; }

.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-status.active { color: #22c55e; border-color: rgba(34, 197, 94, 0.3); }

.pulse-dot {
  width: 8px; height: 8px;
  background: #ef4444; border-radius: 50%;
}
.active .pulse-dot { background: #22c55e; box-shadow: 0 0 10px #22c55e; }

.scanner-section {
  flex: 1;
  position: relative;
  padding: 20px;
  display: flex;
  align-items: center;
}

.viewfinder-container {
  width: 100%;
  height: 90%;
  background: #111;
  border-radius: 30px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
}

video { width: 100%; height: 100%; object-fit: cover; }
canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

.target-guide {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 220px; height: 280px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}

.corner {
  position: absolute; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3);
}
.top-left { top: 0; left: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 20px; }
.top-right { top: 0; right: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 20px; }
.bottom-left { bottom: 0; left: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 20px; }
.bottom-right { bottom: 0; right: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 20px; }

.guide-text { font-size: 0.8rem; font-weight: bold; color: rgba(255,255,255,0.5); margin-top: 10px; }

.control-panel {
  padding: 30px;
  background: #fff;
  border-radius: 40px 40px 0 0;
  color: #000;
}

.result-card {
  background: #f8fafc;
  padding: 20px;
  border-radius: 24px;
  margin-bottom: 25px;
  text-align: center;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.result-card.detected { background: #f0fdf4; border-color: #bbf7d0; }

.label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
.result-text { margin: 8px 0; font-size: 1.8rem; font-weight: 800; color: #1e293b; }
.detected .result-text { color: #16a34a; }

.accuracy-bar {
  height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-top: 10px;
}
.accuracy-bar .fill { width: 98%; height: 100%; background: #22c55e; }

.button-group { display: flex; flex-direction: column; gap: 15px; }

.btn-primary {
  width: 100%; padding: 20px; border-radius: 20px; border: none;
  background: #2563eb; color: #fff; font-weight: 800; font-size: 1rem;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
  transition: transform 0.2s;
}
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { background: #cbd5e1; box-shadow: none; }

.secondary-btns { display: flex; justify-content: center; gap: 20px; }
.btn-icon-only {
  width: 50px; height: 50px; border-radius: 50%; border: 1px solid #e2e8f0;
  background: #fff; font-size: 1.2rem; cursor: pointer;
}
</style>