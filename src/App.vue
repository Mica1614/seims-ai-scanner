<template>
  <div class="app-container">
    <div class="header">
      <h2>🥚 SEIMS AI SCANNER</h2>
      <div class="status-indicator">
        <span :class="['dot', isModelReady ? 'green' : 'red']"></span>
        {{ statusText }}
      </div>
    </div>

    <div class="camera-view">
      <video ref="videoRef" autoplay playsinline muted></video>
      <canvas ref="canvasRef"></canvas>
    </div>

    <div class="controls">
      <div class="result-box">
        <p>DETECTION RESULT:</p>
        <h1 :class="lastResult">{{ lastResult || 'WAITING...' }}</h1>
      </div>
      <button @click="saveToFirebase" :disabled="!lastResult" class="save-btn">
        SAVE TO DASHBOARD
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const videoRef = ref(null);
const canvasRef = ref(null);
const statusText = ref("Initializing AI...");
const isModelReady = ref(false);
const lastResult = ref(null);
let model = null;

const startAI = async () => {
  try {
    // 1. Load AI Model
    model = await cocoSsd.load();
    isModelReady.value = true;
    statusText.value = "AI System Active";

    // 2. Start Back Camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    videoRef.value.srcObject = stream;
    
    // 3. Start Real-time Detection
    detect();
  } catch (err) {
    statusText.value = "Error: " + err.message;
  }
};

const detect = async () => {
  if (model && videoRef.value.readyState === 4) {
    const predictions = await model.detect(videoRef.value);
    
    // Draw Bounding Box
    const ctx = canvasRef.value.getContext("2d");
    canvasRef.value.width = videoRef.value.videoWidth;
    canvasRef.value.height = videoRef.value.videoHeight;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(p => {
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 6;
      ctx.strokeRect(x, y, w, h);
      
      // Similya Detection Mock Logic para sa Presentation
      // Sa totoong model, 'fertile' o 'infertile' ang lalabas dito
      lastResult.value = "FERTILE (98%)"; 
    });
  }
  requestAnimationFrame(detect);
};

const saveToFirebase = async () => {
  try {
    await addDoc(collection(db, "egg_scans"), {
      result: lastResult.value,
      timestamp: serverTimestamp(),
      device: "Mobile AI Cam"
    });
    alert("Success! Check your SEIMS Dashboard.");
  } catch (e) {
    alert("Error saving: " + e.message);
  }
};

onMounted(startAI);
</script>

<style>
body { margin: 0; font-family: 'Poppins', sans-serif; background: #000; }
.app-container { display: flex; flex-direction: column; height: 100vh; color: white; }
.header { padding: 20px; text-align: center; background: #111; border-bottom: 1px solid #333; }
.status-indicator { font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 5px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.green { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
.dot.red { background: #ef4444; }
.camera-view { position: relative; flex: 1; overflow: hidden; }
video { width: 100%; height: 100%; object-fit: cover; }
canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.controls { padding: 30px; background: white; border-radius: 30px 30px 0 0; color: #111; text-align: center; }
.result-box p { margin: 0; font-size: 0.9rem; color: #666; font-weight: bold; }
.result-box h1 { margin: 5px 0 20px 0; font-size: 2rem; }
.FERTILE { color: #16a34a; }
.save-btn { width: 100%; padding: 18px; background: #2563eb; color: white; border: none; border-radius: 15px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
</style>