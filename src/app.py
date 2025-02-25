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
from src.embeddings import EmbeddingsClient
from src.chat_client import ChatClient
from src.gravity_client import GravityAIClient

app = Flask(__name__)

load_dotenv()

# Initialize the Unstructured client
unstructured = UnstructuredClient()

# Initialize the Neo4j client using environment variables
neo4j_uri = os.getenv("NEO4J_URI")
neo4j_user = os.getenv("NEO4J_USER")
neo4j_password = os.getenv("NEO4J_PASSWORD")
neo4j_client = Neo4jClient(neo4j_uri, neo4j_user, neo4j_password)
neo4j_client.initialize_database()

# Add this near the top of app.py with your other imports and constants
DEFAULT_PRICES = {
    "sofa": 499.99,
    "couch": 499.99,
    "chair": 149.99,
    "armchair": 199.99,
    "dining chair": 89.99,
    "table": 299.99,
    "desk": 249.99,
    "bed": 699.99,
    "dresser": 399.99,
    "nightstand": 129.99,
    "bookshelf": 179.99,
    "cabinet": 299.99,
    "potted plant": 39.99,
    "lamp": 79.99,
    "rug": 199.99,
    "mirror": 129.99,
    "clock": 49.99,
    "vase": 29.99,
}


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
    if request.method == "GET":
        return render_template("upload.html")

    if "file" not in request.files:
        return "No file uploaded", 400

    file = request.files["file"]
    if file.filename == "":
        return "No file selected", 400

    if file:
        # Save the uploaded file temporarily
        temp_path = "temp_upload.jpg"
        file.save(temp_path)

        try:
            # Open and fix image rotation before analysis
            with Image.open(temp_path) as img:
                img = fix_image_rotation(img)
                img.save(temp_path)

            # Analyze image with EyePop
            analyzer = ImageAnalyzer()
            prediction_result = analyzer.analyze_image(temp_path)

            # Get room classification
            room_classifier = RoomClassifier()
            room_type = room_classifier.classify_room(temp_path)
            print(f"\nDEBUG - Classified room type: {room_type}")

            # Get embeddings for the room image
            embeddings_client = EmbeddingsClient()
            room_embedding, room_description = embeddings_client.get_image_embedding(temp_path)

            # Get embeddings for detected objects
            objects_with_embeddings = analyzer.get_object_embeddings(temp_path, prediction_result)

            print(f"\nDEBUG - Storing {len(objects_with_embeddings)} objects in room: {room_type}")

            # Store each detected object in Neo4j with its embedding
            for obj in objects_with_embeddings:
                print(f"\nDEBUG - Storing item '{obj['classLabel']}' in room: {room_type}")
                item_data = {
                    "name": obj["classLabel"],
                    "room": room_type,
                    "price": DEFAULT_PRICES.get(obj["classLabel"].lower(), 10.00),
                    "quantity": 1,
                    "confidence": obj["confidence"],
                    "embedding": obj["embedding"],
                    "description": obj.get("description", ""),  # Use get() with default empty string
                    "image_data": obj.get("image_data", ""),
                    "item_id": f"{obj['classLabel']}_{room_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "sku": f"SKU_{obj['classLabel']}_{room_type}",
                    "add_date": datetime.now().strftime("%Y-%m-%d"),
                    "purchase_date": None,
                    "room_embedding": room_embedding,
                }
                print(f"Storing item with description: {item_data['description']}")
                neo4j_client.create_item(item_data)

            # Get visualization and cropped objects
            img_base64 = analyzer.get_base64_plot(temp_path, prediction_result)
            cropped_objects = analyzer.get_cropped_objects(temp_path, prediction_result)

            # Clean up the temporary file
            os.unlink(temp_path)

            return render_template(
                "result.html",
                image_data=img_base64,
                detections=prediction_result["objects"],
                cropped_objects=cropped_objects,
                room_type=room_type,
            )

        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return f"Error processing image: {str(e)}", 400

    return render_template("upload.html")


@app.route("/inventory", methods=["GET", "POST"])
def inventory():
    try:
        # Get QuickBooks inventory data
        qb = QuickBooksInventory()
        report = qb.get_inventory_report("InventoryValuationSummary")

        if not report["success"]:
            return render_template("inventory.html", error=report["error"])

        # Get all room assignments from Neo4j in one query
        query = """
        MATCH (i:InventoryItem)-[r:LOCATED_IN]->(room:Room)
        RETURN i.name as item_name, room.name as room_name, r.last_updated as last_updated
        """

        # Create a mapping of item names to rooms
        item_rooms = {}
        try:
            with neo4j_client.driver.session() as session:
                results = session.run(query)
                for result in results:
                    item_name = result["item_name"].lower()
                    if item_name not in item_rooms:
                        item_rooms[item_name] = []
                    item_rooms[item_name].append({"room": result["room_name"], "updated": result["last_updated"]})
        except Exception as e:
            logging.error(f"Neo4j query error: {e}")

        # Process the QuickBooks report data
        rooms_data = {}
        total_value = 0

        for row in report["rows"]:
            if isinstance(row, dict):
                item_name = row["Item"].lower()
                # Find room assignments for this item
                rooms = item_rooms.get(item_name, [{"room": "Unassigned", "updated": None}])

                for room_info in rooms:
                    room_name = room_info["room"]
                    if room_name not in rooms_data:
                        rooms_data[room_name] = []

                    # Create a copy of the row for this room
                    room_item = row.copy()
                    room_item["location_updated"] = room_info["updated"]
                    rooms_data[room_name].append(room_item)

                try:
                    total_value += float(row.get("Value", 0))
                except (ValueError, TypeError):
                    pass

        return render_template("inventory.html", rooms_data=rooms_data, total_value=total_value)

    except Exception as e:
        logging.error(f"Error in inventory route: {e}")
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


@app.route("/search", methods=["POST"])
def search():
    query = request.json.get("query")
    if not query:
        return {"error": "No query provided"}, 400

    try:
        results = neo4j_client.search_similar_items(query)
        return {"results": results}
    except Exception as e:
        return {"error": str(e)}, 500


@app.route("/chat", methods=["GET", "POST"])
def chat():
    if request.method == "GET":
        return render_template("chat.html")

    try:
        print("DEBUG - Chat request received")
        data = request.json
        if not data or "query" not in data:
            return {"error": "No query provided"}, 400

        query = data["query"]

        # Get similar items from Neo4j using vector similarity
        print("DEBUG - Searching for similar items")
        similar_items = neo4j_client.search_similar_items(query, limit=5)
        print(f"DEBUG - Found {len(similar_items)} similar items")

        # Format the context in a more natural way, including descriptions
        context = "Here's what I found in your inventory:\n\n"
        print("DEBUG - Context: ", context)

        # Group items by room
        rooms = {}
        for item in similar_items:
            print("DEBUG - Item: ", item)
            room = item["room"]
            print("DEBUG - Room: ", room)
            if room not in rooms:
                print("DEBUG - Adding room to rooms: ", room)
                rooms[room] = []
            print("DEBUG - Adding item to room: ", item)
            rooms[room].append(item)

        # Create natural language context with descriptions
        for room, items in rooms.items():
            context += f"In the {room}, I found:\n"
            for item in items:
                price_str = f"${item['price']:.2f}" if item["price"] else "price not set"
                context += f"\n- {item['quantity']} {item['name']} (priced at {price_str} each)\n"
                if item.get("description"):
                    context += f"  Description: {item['description']}\n"
            context += "\n"

        print(f"Sending context to ChatAI:\n{context}")

        # Use GravityAI to get response
        # gravity_client = GravityAIClient()
        # prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nPlease answer based on the context provided."
        # response = gravity_client.chat_completion(prompt)

        chat_client = ChatClient()
        response = chat_client.get_llm_response(context, query)

        if not response:
            return {"error": "No response from AI"}, 500

        return {"response": response, "context": similar_items}

    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {"error": str(e)}, 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
