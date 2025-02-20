from eyepop import EyePopSdk
from eyepop.worker.worker_types import Pop, InferenceComponent, InferenceType
from dotenv import load_dotenv
import os
from PIL import Image
import matplotlib.pyplot as plt
import io
import base64
import matplotlib
from openai import OpenAI
import logging
from src.embeddings import EmbeddingsClient

matplotlib.use("Agg")  # Set the backend to non-interactive


class RoomClassifier:
    """
    A class to handle room classification using OpenAI's Vision API.
    """

    def __init__(self):
        load_dotenv()
        self.client = OpenAI()  # This will use OPENAI_API_KEY from environment
        self.valid_rooms = ["office", "bedroom", "bathroom", "kitchen", "living room", "entry", "dining room", "family room"]

    def classify_room(self, image_path):
        """
        Use OpenAI's GPT-4 Vision API to classify which room in a house the image shows.

        Args:
            image_path (str): Path to the image file

        Returns:
            str: The classified room type (one of the valid_rooms) or "unknown"
        """
        try:
            # Read and encode the image
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode("utf-8")

            # Create the prompt for room classification
            prompt = (
                "What room in the house is this? "
                f"Please respond with exactly one room from these choices: {', '.join(self.valid_rooms)}."
            )

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                        ],
                    }
                ],
                max_tokens=300,
            )

            room = response.choices[0].message.content.strip().lower()
            logging.info(f"OpenAI room classification response: {room}")

            # Validate the response is one of our valid room types
            if room in self.valid_rooms:
                return room
            else:
                # Check if the response contains any of our valid room types
                for valid_room in self.valid_rooms:
                    if valid_room in room:
                        return valid_room

                logging.warning(f"OpenAI returned invalid room type: {room}")
                return "unknown"

        except Exception as e:
            logging.error(f"Error in OpenAI vision analysis: {e}")
            return "unknown"


class ImageAnalyzer:
    def __init__(self, confidence_threshold=0.7):
        load_dotenv()
        self.pop_id = os.getenv("EYEPOP_POP_ID")
        self.secret_key = os.getenv("EYEPOP_SECRET_KEY")
        self.confidence_threshold = confidence_threshold

    def compute_iou(self, box1, box2):
        """
        Compute Intersection over Union (IoU) between two bounding boxes
        """
        # Calculate coordinates of intersection
        x1 = max(box1["x"], box2["x"])
        y1 = max(box1["y"], box2["y"])
        x2 = min(box1["x"] + box1["width"], box2["x"] + box2["width"])
        y2 = min(box1["y"] + box1["height"], box2["y"] + box2["height"])

        # Calculate area of intersection
        intersection = max(0, x2 - x1) * max(0, y2 - y1)

        # Calculate area of both boxes
        box1_area = box1["width"] * box1["height"]
        box2_area = box2["width"] * box2["height"]

        # Calculate IoU
        union = box1_area + box2_area - intersection
        return intersection / union if union > 0 else 0

    def apply_nms(self, objects, iou_threshold=0.5):
        """
        Apply Non-Max Suppression to filter overlapping detections
        """
        # Sort objects by confidence
        sorted_objects = sorted(objects, key=lambda x: x["confidence"], reverse=True)
        kept_objects = []

        while sorted_objects:
            # Keep the highest confidence detection
            current = sorted_objects.pop(0)
            kept_objects.append(current)

            # Filter out overlapping detections with same class
            sorted_objects = [
                obj
                for obj in sorted_objects
                if (obj["classLabel"] != current["classLabel"] or self.compute_iou(current, obj) < iou_threshold)
            ]

        return kept_objects

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

            # Apply NMS to filter overlapping detections
            result["objects"] = self.apply_nms(result["objects"])

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
            if False:  # don't show the confidence on the images for now
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

            # Remove or comment out this block to match visualize_prediction behavior
            # for obj in prediction_result["objects"]:
            #     x = obj["x"]
            #     y = obj["y"]
            #     confidence = f"{obj['confidence']:.1%}"
            #     label = f"{obj['classLabel']} ({confidence})"
            #     plt.text(x, y - 10, label, color="white", bbox=dict(facecolor="red", alpha=0.7), fontsize=8)

            plt.axis("off")

            # Save plot to bytes buffer
            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            plt.close()
            buf.seek(0)

            # Convert to base64
            image_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return image_base64

    def get_cropped_objects(self, image_path, prediction_result):
        """
        Create cropped images for each detected object and return them as base64 strings
        """
        cropped_objects = []
        with Image.open(image_path) as image:
            for obj in prediction_result["objects"]:
                # Get bounding box coordinates (already in pixels)
                left = max(0, int(obj["x"]))
                top = max(0, int(obj["y"]))
                right = min(image.width, int(obj["x"] + obj["width"]))
                bottom = min(image.height, int(obj["y"] + obj["height"]))

                # Crop the image
                try:
                    cropped = image.crop((left, top, right, bottom))

                    # Convert to base64
                    buf = io.BytesIO()
                    cropped.save(buf, format="PNG")
                    buf.seek(0)
                    img_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")

                    # Add to results
                    cropped_objects.append({"label": obj["classLabel"], "confidence": obj["confidence"], "image": img_base64})
                except Exception as e:
                    print(f"Error cropping object {obj['classLabel']}: {e}")
                    continue

        return cropped_objects

    def get_object_embeddings(self, image_path, prediction_result):
        """
        Get embeddings for each detected object using their cropped images
        """
        embeddings_client = EmbeddingsClient()
        objects_with_embeddings = []

        cropped_objects = self.get_cropped_objects(image_path, prediction_result)

        for obj, cropped in zip(prediction_result["objects"], cropped_objects):
            try:
                # Convert base64 back to bytes
                image_bytes = base64.b64decode(cropped["image"])

                # Get embedding for the cropped object image
                embedding = embeddings_client.get_image_embedding(image_data=image_bytes)

                objects_with_embeddings.append(
                    {
                        "classLabel": obj["classLabel"],
                        "confidence": obj["confidence"],
                        "embedding": embedding,
                        "image_data": image_bytes,
                    }
                )

                print(f"Generated embedding for {obj['classLabel']}")

            except Exception as e:
                print(f"Error getting embedding for {obj['classLabel']}: {e}")
                continue

        return objects_with_embeddings


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
