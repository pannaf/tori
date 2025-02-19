from eyepop import EyePopSdk
from eyepop.worker.worker_types import Pop, InferenceComponent, InferenceType
from dotenv import load_dotenv
import os
from PIL import Image
import matplotlib.pyplot as plt
import io
import base64
import matplotlib

matplotlib.use("Agg")  # Set the backend to non-interactive


class ImageAnalyzer:
    def __init__(self, confidence_threshold=0.7):
        load_dotenv()
        self.pop_id = os.getenv("EYEPOP_POP_ID")
        self.secret_key = os.getenv("EYEPOP_SECRET_KEY")
        self.confidence_threshold = confidence_threshold

    def analyze_image(self, image_path):
        """
        Analyze an image using EyePop SDK and return the prediction result
        Uses both person detection and YOLO model for common objects
        """
        with EyePopSdk.workerEndpoint(pop_id=self.pop_id, secret_key=self.secret_key) as endpoint:
            # First, load the YOLO model for common objects
            yolo_model = {
                "id": "yolo-v7",
                "model_folder_url": "https://s3.amazonaws.com/models.eyepop.ai/releases/yolov7/1.0.1/models/YOLOv7/COCO/Latest/TensorFlowLite/float32",
            }
            yolo = endpoint.load_model(yolo_model)

            # Configure Pop with both person detection and YOLO
            pop = Pop(
                components=[
                    # Person detection
                    InferenceComponent(
                        model="eyepop.person:latest", categoryName="person", confidenceThreshold=self.confidence_threshold
                    ),
                    # Common object detection with YOLO
                    InferenceComponent(
                        inferenceTypes=[InferenceType.OBJECT_DETECTION],
                        modelUuid=yolo["id"],
                        confidenceThreshold=self.confidence_threshold,
                    ),
                ]
            )

            # Set the Pop configuration
            endpoint.set_pop(pop)

            # Process the image
            result = endpoint.upload(image_path).predict()

            return result

    def visualize_prediction(self, image_path, prediction_result):
        """
        Display the image with its prediction overlay and confidence scores
        """
        with Image.open(image_path) as image:
            plt.figure(figsize=(10, 8))
            plt.imshow(image)
            plot = EyePopSdk.plot(plt.gca())
            plot.prediction(prediction_result)

            # Add confidence scores for each detection
            for obj in prediction_result["objects"]:  # Changed from prediction_result.detections
                # Get bounding box coordinates
                x = obj["x"]  # Changed from detection.boundingBox.x
                y = obj["y"]  # Changed from detection.boundingBox.y

                # Format confidence score as percentage
                confidence = f"{obj['confidence']:.1%}"
                label = f"{obj['classLabel']} ({confidence})"

                # Add text above the bounding box
                plt.text(x, y - 10, label, color="white", bbox=dict(facecolor="red", alpha=0.7), fontsize=8)

            plt.axis("off")  # Hide axes
            plt.show()

    def get_base64_plot(self, image_path, prediction_result):
        """
        Create the visualization and return it as a base64 string
        """
        with Image.open(image_path) as image:
            plt.figure(figsize=(10, 8))
            plt.imshow(image)
            plot = EyePopSdk.plot(plt.gca())
            plot.prediction(prediction_result)

            for obj in prediction_result["objects"]:
                x = obj["x"]
                y = obj["y"]
                confidence = f"{obj['confidence']:.1%}"
                label = f"{obj['classLabel']} ({confidence})"
                plt.text(x, y - 10, label, color="white", bbox=dict(facecolor="red", alpha=0.7), fontsize=8)

            plt.axis("off")

            # Save plot to bytes buffer
            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            plt.close()
            buf.seek(0)

            # Convert to base64
            image_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return image_base64


def main():
    # Create analyzer with custom confidence threshold
    analyzer = ImageAnalyzer(confidence_threshold=0.3)
    image_path = "example.jpg"

    # Analyze the image
    result = analyzer.analyze_image(image_path)
    print("Prediction result:", result)

    # Visualize the results
    analyzer.visualize_prediction(image_path, result)


if __name__ == "__main__":
    main()
