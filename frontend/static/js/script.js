/**
 * FreshScan – script.js
 * Handles: image preview, drag & drop, prediction fetch, result display
 */

// ── DOM References ──────────────────────────────────────────────
const uploadZone      = document.getElementById('uploadZone');
const fileInput       = document.getElementById('fileInput');
const browseBtn       = document.getElementById('browseBtn');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const previewWrap     = document.getElementById('previewWrap');
const previewImg      = document.getElementById('previewImg');
const removeBtn       = document.getElementById('removeBtn');
const predictBtn      = document.getElementById('predictBtn');
const btnText         = document.getElementById('btnText');
const spinner         = document.getElementById('spinner');
const resultBox       = document.getElementById('resultBox');
const resultIcon      = document.getElementById('resultIcon');
const resultClass     = document.getElementById('resultClass');
const resultConfidence = document.getElementById('resultConfidence');
const confidenceBar   = document.getElementById('confidenceBar');
const errorBox        = document.getElementById('errorBox');
const errorMsg        = document.getElementById('errorMsg');

let selectedFile = null;

// ── Navbar scroll shadow ─────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 10);
});

// ── File Selection via Browse ────────────────────────────────────
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', () => {
  if (!selectedFile) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
});

// ── Drag & Drop ──────────────────────────────────────────────────
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── Remove Image ─────────────────────────────────────────────────
removeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUpload();
});

// ── Handle Selected File ─────────────────────────────────────────
function handleFile(file) {
  // Validate type
  if (!file.type.startsWith('image/')) {
    showError('Please upload a valid image file (JPG, PNG, WEBP).');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    uploadPlaceholder.style.display = 'none';
    previewWrap.style.display = 'block';
  };
  reader.readAsDataURL(file);

  predictBtn.disabled = false;
  hideResults();
}

// ── Reset to initial state ───────────────────────────────────────
function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewWrap.style.display = 'none';
  uploadPlaceholder.style.display = 'block';
  predictBtn.disabled = true;
  hideResults();
}

// ── Prediction ───────────────────────────────────────────────────
predictBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Show loading state
  setLoading(true);
  hideResults();

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      showError(data.error);
    } else {
      showResult(data.class, data.confidence);
    }

  } catch (err) {
    showError(err.message || 'Failed to connect to the server. Please try again.');
  } finally {
    setLoading(false);
  }
});

// ── Loading State ────────────────────────────────────────────────
function setLoading(loading) {
  predictBtn.disabled = loading;
  spinner.style.display = loading ? 'block' : 'none';
  btnText.textContent = loading ? 'Analyzing...' : 'Predict Freshness';
}

// ── Show Result ──────────────────────────────────────────────────
function showResult(classLabel, confidence) {
  const isRotten = classLabel.toLowerCase().includes('rotten');
  const confVal  = parseFloat(confidence);

  // Determine icon
  resultIcon.textContent = isRotten ? '🍂' : '✅';

  // Class label (format: "Apple_Healthy" → "Apple — Healthy")
  const formatted = classLabel.replace(/_/g, ' — ');
  resultClass.textContent = formatted;

  // Confidence display
  resultConfidence.textContent = `Confidence: ${confVal.toFixed(1)}%`;

  // Confidence bar (animate after render)
  confidenceBar.style.width = '0%';
  resultBox.className = 'result-box';
  if (isRotten) resultBox.classList.add('rotten');

  resultBox.style.display = 'block';
  errorBox.style.display  = 'none';

  // Animate bar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      confidenceBar.style.width = confVal + '%';
    });
  });
}

// ── Show Error ───────────────────────────────────────────────────
function showError(message) {
  errorMsg.textContent = message;
  errorBox.style.display = 'block';
  resultBox.style.display = 'none';
}

// ── Hide Results ─────────────────────────────────────────────────
function hideResults() {
  resultBox.style.display = 'none';
  errorBox.style.display  = 'none';
}