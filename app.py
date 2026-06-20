import os
import io
import torch
from flask import Flask, request, jsonify, render_template
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

app = Flask(__name__)

# Configure device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load CLIP model and processor on startup
MODEL_ID = "openai/clip-vit-base-patch32"
print(f"Loading CLIP model '{MODEL_ID}'...")
try:
    model = CLIPModel.from_pretrained(MODEL_ID).to(device)
    processor = CLIPProcessor.from_pretrained(MODEL_ID)
    print("CLIP model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    processor = None

# Labels and prompt templates for zero-shot classification
FESTIVAL_MAP = {
    "Eid": "a photo of Eid celebration, Muslims praying, sharing sweets, or traditional panjabi clothing",
    "Durga Puja": "a photo of Durga Puja celebration, Goddess Durga idol, or Bengali people celebrating Puja in traditional sarees",
    "Christmas": "a photo of Christmas celebration, decorated Christmas tree, ornaments, or Santa Claus",
    "Other": "a photo of everyday objects, landscape, animals, vehicles, or unrelated generic content"
}

CATEGORIES = list(FESTIVAL_MAP.keys())
PROMPTS = [FESTIVAL_MAP[cat] for cat in CATEGORIES]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or processor is None:
        return jsonify({"error": "Model not loaded successfully on server."}), 500

    if 'image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename."}), 400

    try:
        # Read and open the image
        img_bytes = file.read()
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"Invalid image format: {str(e)}"}), 400

    try:
        # Process the image and prompts
        inputs = processor(text=PROMPTS, images=image, return_tensors="pt", padding=True)
        # Move inputs to same device as model
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            # Retrieve the similarity logits between image and text queries
            logits_per_image = outputs.logits_per_image
            # Convert logits to probabilities
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

        # Structure response
        results = []
        for cat, prob in zip(CATEGORIES, probs):
            results.append({
                "label": cat,
                "confidence": float(prob)
            })

        # Sort results by confidence in descending order
        results = sorted(results, key=lambda x: x['confidence'], reverse=True)

        return jsonify({
            "success": True,
            "predictions": results
        })

    except Exception as e:
        return jsonify({"error": f"Failed during model prediction: {str(e)}"}), 500

if __name__ == '__main__':
    # Start the Flask app (use port 7860 as default for Hugging Face Spaces compatibility)
    port = int(os.environ.get("PORT", 7860))
    app.run(host='0.0.0.0', port=port, debug=True)
