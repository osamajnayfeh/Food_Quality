"""
FreshScan – app.py
Flask backend for the Food Quality Analysis System.

Routes:
  GET  /         → Serves the main HTML page
  POST /predict  → Accepts an image, runs model inference, returns JSON
"""

import os
import numpy as np
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename

# ── TensorFlow / Keras ────────────────────────────────────────────
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image as keras_image

# ── App Configuration ─────────────────────────────────────────────
app = Flask(
    __name__,
    template_folder="../frontend/templates",
    static_folder="../frontend/static"
)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

# ── Constants ─────────────────────────────────────────────────────
MODEL_PATH   = "food_model.h5"   # Path to the saved Keras model
IMG_SIZE     = (224, 224)        # Must match training image size
ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp"}

# 28 class labels — order must match the model's training class indices
CLASS_NAMES = [
    "Apple_Healthy",    "Apple_Rotten",
    "Banana_Healthy",   "Banana_Rotten",
    "Bellpepper_Healthy", "Bellpepper_Rotten",
    "Carrot_Healthy",   "Carrot_Rotten",
    "Cucumber_Healthy", "Cucumber_Rotten",
    "Grape_Healthy",    "Grape_Rotten",
    "Guava_Healthy",    "Guava_Rotten",
    "Jujube_Healthy",   "Jujube_Rotten",
    "Mango_Healthy",    "Mango_Rotten",
    "Orange_Healthy",   "Orange_Rotten",
    "Pomegranate_Healthy", "Pomegranate_Rotten",
    "Potato_Healthy",   "Potato_Rotten",
    "Strawberry_Healthy", "Strawberry_Rotten",
    "Tomato_Healthy",   "Tomato_Rotten",
]

# ── Load Model ────────────────────────────────────────────────────
model = None

def load_food_model():
    """Load the trained Keras model from disk."""
    global model
    if os.path.exists(MODEL_PATH):
        print(f"[FreshScan] Loading model from '{MODEL_PATH}' …")
        model = load_model(MODEL_PATH)
        print("[FreshScan] Model loaded successfully.")
    else:
        print(f"[FreshScan] WARNING: Model file '{MODEL_PATH}' not found.")
        print("[FreshScan] The /predict endpoint will return a demo response.")

# ── Helpers ───────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS


def preprocess_image(img_path: str) -> np.ndarray:
    """Load and preprocess an image for model inference."""
    img = keras_image.load_img(img_path, target_size=IMG_SIZE)
    arr = keras_image.img_to_array(img)
    arr = arr / 255.0                   # Normalize to [0, 1]
    arr = np.expand_dims(arr, axis=0)   # Add batch dimension → (1, 224, 224, 3)
    return arr


def predict_image(img_path: str) -> dict:
    """Run inference and return class label + confidence."""
    processed = preprocess_image(img_path)
    predictions = model.predict(processed, verbose=0)  # shape: (1, 28)
    class_idx  = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0])) * 100
    class_label = CLASS_NAMES[class_idx]
    return {"class": class_label, "confidence": round(confidence, 2)}

# ── Routes ────────────────────────────────────────────────────────

@app.route("/")
def home():
    """Render the main landing + prediction page."""
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accept a multipart/form-data POST with key 'image'.
    Returns JSON: { "class": str, "confidence": float }
    or            { "error": str }
    """
    # 1. Check file presence
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Please upload JPG, PNG, or WEBP."}), 400

    # 2. Save temporarily
    filename   = secure_filename(file.filename)
    tmp_dir    = os.path.join(app.root_path, "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path   = os.path.join(tmp_dir, filename)
    file.save(tmp_path)

    # 3. Run inference
    try:
        if model is None:
            # ── DEMO MODE (no model loaded) ──────────────────────
            # Replace this block with real inference once model is ready.
            import random
            demo_class      = random.choice(CLASS_NAMES)
            demo_confidence = round(random.uniform(85, 99), 2)
            result = {"class": demo_class, "confidence": demo_confidence}
        else:
            result = predict_image(tmp_path)

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({"error": "Prediction failed. Please try again."}), 500

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ── Run ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_food_model()
    app.run(debug=True, host="0.0.0.0", port=5000)