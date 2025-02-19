from flask import Flask, request, render_template
from src.vision import ImageAnalyzer
import os

app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        if "file" not in request.files:
            return "No file uploaded"

        file = request.files["file"]
        if file.filename == "":
            return "No file selected"

        # Save uploaded file temporarily
        temp_path = "temp_upload.jpg"
        file.save(temp_path)

        # Analyze image
        analyzer = ImageAnalyzer(confidence_threshold=0.3)
        result = analyzer.analyze_image(temp_path)

        # Get visualization
        img_base64 = analyzer.get_base64_plot(temp_path, result)

        # Clean up
        os.remove(temp_path)

        return render_template("result.html", image_data=img_base64, detections=result["objects"])

    return render_template("upload.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
