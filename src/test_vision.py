from src.vision import ImageAnalyzer
import json


def test_detection():
    # Create analyzer with lower confidence threshold for testing
    analyzer = ImageAnalyzer(confidence_threshold=0.3)

    # Test image path
    image_path = "example.jpg"  # make sure this image exists

    # Test basic detection
    result = analyzer.analyze_image(image_path)
    print("\nDetection Result:")
    print(json.dumps(result, indent=2))

    # Print bounding box coordinates for debugging
    print("\nBounding Box Coordinates:")
    for obj in result["objects"]:
        print(f"\nObject: {obj['classLabel']}")
        print(f"x: {obj['x']}, y: {obj['y']}")
        print(f"width: {obj['width']}, height: {obj['height']}")
        print(f"Calculated coordinates would be:")
        width, height = 100, 100  # example image dimensions
        left = int(obj["x"] * width)
        top = int(obj["y"] * height)
        right = int((obj["x"] + obj["width"]) * width)
        bottom = int((obj["y"] + obj["height"]) * height)
        print(f"left: {left}, top: {top}, right: {right}, bottom: {bottom}")


if __name__ == "__main__":
    test_detection()
