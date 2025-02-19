from flask import Flask, request, render_template, redirect
from src.vision import ImageAnalyzer, RoomClassifier
from src.quickbooks_integration import QuickBooksInventory
from src.neo4j_client import Neo4jClient
import os
from PIL import Image, ExifTags
import io
import tempfile
from src.unstructured_client import UnstructuredClient
import base64
from datetime import datetime
import logging
from dotenv import load_dotenv

app = Flask(__name__)

load_dotenv()

# Initialize the Unstructured client
unstructured = UnstructuredClient()

# Initialize the Neo4j client using environment variables
neo4j_uri = os.getenv("NEO4J_URI")
neo4j_user = os.getenv("NEO4J_USER")
neo4j_password = os.getenv("NEO4J_PASSWORD")
neo4j_client = Neo4jClient(neo4j_uri, neo4j_user, neo4j_password)


def fix_image_rotation(image):
    """Fix image rotation based on EXIF data"""
    try:
        # Check if image has EXIF data
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == "Orientation":
                break

        exif = dict(image._getexif().items())

        if orientation in exif:
            if exif[orientation] == 3:
                image = image.rotate(180, expand=True)
            elif exif[orientation] == 6:
                image = image.rotate(270, expand=True)
            elif exif[orientation] == 8:
                image = image.rotate(90, expand=True)

    except (AttributeError, KeyError, IndexError):
        # No EXIF data or orientation tag, return original image
        pass

    return image


@app.route("/", methods=["GET"])
def landing():
    return render_template("landing.html")


@app.route("/upload", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        if "file" not in request.files:
            return redirect(request.url)

        file = request.files["file"]
        if file.filename == "":
            return redirect(request.url)

        if file:
            # Read the image
            image_data = file.read()
            image = Image.open(io.BytesIO(image_data))

            # Fix rotation
            image = fix_image_rotation(image)

            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
            image.save(temp_file.name, format="JPEG")

            # Analyze image with EyePop
            analyzer = ImageAnalyzer(confidence_threshold=0.3)
            result = analyzer.analyze_image(temp_file.name)

            # Classify room with OpenAI Vision
            room_classifier = RoomClassifier()
            room_type = room_classifier.classify_room(temp_file.name)

            # Get visualization and cropped objects
            img_base64 = analyzer.get_base64_plot(temp_file.name, result)
            cropped_objects = analyzer.get_cropped_objects(temp_file.name, result)

            # Add detected objects to QuickBooks and then to Neo4j
            qb = QuickBooksInventory()
            inventory_results = []
            for obj in result["objects"]:
                qb_result = qb.add_detected_item(obj)
                inventory_results.append(qb_result)

                # Prepare today's date as the add date for photo uploads.
                add_date = datetime.now().strftime("%Y-%m-%d")

                neo4j_item_data = {
                    "item_id": qb_result.get("item_id", qb_result.get("id", "unknown")),
                    "name": qb_result.get("name", "Unknown Item"),
                    "sku": qb_result.get("sku", "N/A"),
                    "price": qb_result.get("price", 0),
                    "quantity": obj.get("quantity", 1),
                    "add_date": add_date,
                    "purchase_date": None,  # No purchase date for photo uploads
                    "room": room_type,  # Add the room classification
                }
                try:
                    neo4j_client.create_item(neo4j_item_data)
                except Exception as e:
                    logging.error("Neo4j create error for photo detection item: %s", e)

            # Clean up the temporary file
            os.unlink(temp_file.name)

            return render_template(
                "result.html",
                image_data=img_base64,
                detections=result["objects"],
                cropped_objects=cropped_objects,
                inventory_results=inventory_results,
                room_type=room_type,
            )

    return render_template("upload.html")


@app.route("/inventory", methods=["GET", "POST"])
def inventory():
    try:
        qb = QuickBooksInventory()
        report = qb.get_inventory_report("InventoryValuationSummary")

        print("DEBUG - Report response:", report)

        if not report["success"]:
            return render_template("inventory.html", error=report["error"])

        # Process the report data
        report_data = []
        total_value = 0

        print("DEBUG - Report rows:", report["rows"])

        for row in report["rows"]:
            if isinstance(row, dict):  # Skip header/summary rows
                report_data.append(row)
                try:
                    total_value += float(row.get("Value", 0))
                except (ValueError, TypeError):
                    pass

        print("DEBUG - Processed data:", report_data)
        print("DEBUG - Total value:", total_value)

        return render_template("inventory.html", report_data=report_data, total_value=total_value)

    except Exception as e:
        print("DEBUG - Error:", str(e))
        return render_template("inventory.html", error=str(e))


@app.route("/upload_receipt", methods=["POST"])
def upload_receipt():
    if "receipt" not in request.files:
        return "No file uploaded", 400

    file = request.files["receipt"]
    if file.filename == "":
        return "No file selected", 400

    # Save the uploaded file temporarily
    temp_path = "temp_receipt.jpg"
    file.save(temp_path)

    try:
        # Process with Unstructured.io
        structured_data = unstructured.process_receipt(temp_path)

        # Extract relevant data from the API response
        receipt_data = unstructured.extract_receipt_data(structured_data)

        # Update inventory in QuickBooks based on receipt items.
        qb = QuickBooksInventory()
        inventory_results = []
        for item in receipt_data.get("items", []):
            qb_result = qb.add_receipt_item(item)
            inventory_results.append(qb_result)

            # Use today's date as the add date and extract the purchase date from the receipt.
            add_date = datetime.now().strftime("%Y-%m-%d")
            purchase_date = item.get("purchase_date", add_date)

            neo4j_item_data = {
                "item_id": qb_result.get("item_id", qb_result.get("id", "unknown")),
                "name": qb_result.get("name", "Unknown Item"),
                "sku": qb_result.get("sku", "N/A"),
                "price": qb_result.get("price", 0),
                "quantity": qb_result.get("quantity", 1),
                "add_date": add_date,
                "purchase_date": purchase_date,
                "room": "unknown",  # For receipts, we don't know the room
            }
            try:
                neo4j_client.create_item(neo4j_item_data)
            except Exception as e:
                logging.error("Neo4j create error for receipt item: %s", e)

        # Read the receipt image and encode as Base64 for displaying in the template
        with open(temp_path, "rb") as img_file:
            receipt_image_base64 = base64.b64encode(img_file.read()).decode("utf-8")

        # Render the receipt result view with the processed image and items found
        return render_template(
            "receipt_result.html",
            receipt_image=receipt_image_base64,
            items=receipt_data.get("items", []),
            inventory_results=inventory_results,
        )

    except Exception as e:
        return f"Error processing receipt: {str(e)}", 400

    finally:
        # Clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
