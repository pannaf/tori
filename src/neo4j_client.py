from neo4j import GraphDatabase
import logging
import uuid
from src.embeddings import EmbeddingsClient
import numpy as np

# Change logging level for neo4j
logging.getLogger("neo4j").setLevel(logging.WARNING)


class Neo4jClient:
    def __init__(self, uri, user, password):
        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            logging.info("Connected to Neo4j")
        except Exception as e:
            logging.error(f"Error connecting to Neo4j: {e}")
            self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def create_item(self, item_data):
        """Create or update an inventory item with embeddings and description"""
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        with self.driver.session() as session:
            # First create/update the Room node
            room_query = """
            MERGE (r:Room {name: $room})
            SET r.embedding = $room_embedding
            RETURN r
            """
            session.run(room_query, {"room": item_data["room"], "room_embedding": item_data["room_embedding"]})

            # Then create/update the InventoryItem node with description
            item_query = """
            MERGE (i:InventoryItem {item_id: $item_id})
            SET 
                i.name = $name,
                i.sku = $sku,
                i.price = $price,
                i.quantity = $quantity,
                i.confidence = $confidence,
                i.embedding = $embedding,
                i.description = $description,
                i.add_date = $add_date,
                i.purchase_date = $purchase_date,
                i.updated_at = datetime()
            WITH i
            MATCH (r:Room {name: $room})
            MERGE (i)-[rel:LOCATED_IN]->(r)
            SET rel.last_updated = datetime()
            RETURN i
            """

            session.run(
                item_query,
                {
                    "item_id": item_data["item_id"],
                    "name": item_data["name"],
                    "sku": item_data["sku"],
                    "price": float(item_data["price"]),
                    "quantity": int(item_data["quantity"]),
                    "confidence": float(item_data["confidence"]),
                    "embedding": item_data["embedding"],
                    "description": item_data.get("description", ""),  # Handle missing descriptions
                    "room": item_data["room"],
                    "add_date": item_data["add_date"],
                    "purchase_date": item_data["purchase_date"],
                },
            )

    def cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        return dot_product / (norm1 * norm2) if norm1 and norm2 else 0

    def search_similar_items(self, query_text: str, limit: int = 5):
        """Search for similar items using vector similarity"""
        embeddings_client = EmbeddingsClient()
        query_embedding = embeddings_client.get_text_embedding(query_text)
        print(f"\nSearching for: {query_text}")

        cypher_query = """
        MATCH (i:InventoryItem)-[rel:LOCATED_IN]->(r:Room)
        WHERE i.embedding IS NOT NULL
        RETURN 
            i.name as name,
            i.description as description,
            i.price as price,
            i.quantity as quantity,
            r.name as room,
            i.embedding as embedding,
            r.embedding as room_embedding
        """

        with self.driver.session() as session:
            results = session.run(cypher_query)
            items = [dict(record) for record in results]

        print(f"Found {len(items)} items in database")

        # Calculate similarities
        for item in items:
            item_similarity = self.cosine_similarity(query_embedding, item["embedding"]) if item.get("embedding") else 0
            room_similarity = (
                self.cosine_similarity(query_embedding, item.get("room_embedding", [])) if item.get("room_embedding") else 0
            )

            item["similarity"] = 0.7 * item_similarity + 0.3 * room_similarity
            print(f"Similarity for {item['name']} in {item['room']}: {item['similarity']:.3f}")
            if item.get("description"):
                print(f"Description: {item['description']}")

        # Sort and filter
        items.sort(key=lambda x: x.get("similarity", 0), reverse=True)
        similar_items = [
            {
                "name": item["name"],
                "description": item.get("description", ""),
                "price": item.get("price"),
                "quantity": item.get("quantity"),
                "room": item["room"],
                "similarity": item.get("similarity", 0),
            }
            for item in items[:limit]
            if item.get("similarity", 0) > 0.2
        ]

        print(f"Returning {len(similar_items)} similar items")
        return similar_items

    def initialize_database(self):
        """Initialize Neo4j database with required indexes and constraints"""
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        with self.driver.session() as session:
            # Create constraints
            constraints = [
                "CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:InventoryItem) REQUIRE i.item_id IS UNIQUE",
                "CREATE CONSTRAINT room_name IF NOT EXISTS FOR (r:Room) REQUIRE r.name IS UNIQUE",
            ]

            # Create indexes for faster lookups
            indexes = [
                "CREATE INDEX item_name IF NOT EXISTS FOR (i:InventoryItem) ON (i.name)",
                "CREATE INDEX item_description IF NOT EXISTS FOR (i:InventoryItem) ON (i.description)",
                "CREATE INDEX room_embedding IF NOT EXISTS FOR (r:Room) ON (r.embedding)",
                "CREATE INDEX item_embedding IF NOT EXISTS FOR (i:InventoryItem) ON (i.embedding)",
            ]

            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception as e:
                    logging.warning(f"Constraint creation warning: {e}")

            for index in indexes:
                try:
                    session.run(index)
                except Exception as e:
                    logging.warning(f"Index creation warning: {e}")
