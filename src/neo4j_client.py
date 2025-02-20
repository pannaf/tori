from neo4j import GraphDatabase
import logging
import uuid
from src.embeddings import EmbeddingsClient

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
        """
        Update the create_item method to include embeddings
        """
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        # Generate embeddings for the item
        embeddings_client = EmbeddingsClient()

        # Get text embedding from item description
        item_description = f"{item_data['name']} - A {item_data.get('room', 'unknown')} item priced at ${item_data.get('price', 0)}"
        text_embedding = embeddings_client.get_text_embedding(item_description)

        # Add embedding to item_data
        item_data["embedding"] = text_embedding

        query = """
        MERGE (i:InventoryItem {item_id: $item_id})
        ON CREATE SET 
            i.name = $name,
            i.sku = $sku,
            i.price = $price,
            i.quantity = $quantity,
            i.add_date = $add_date,
            i.purchase_date = $purchase_date,
            i.created_at = timestamp(),
            i.embedding = $embedding
        ON MATCH SET 
            i.name = $name,
            i.sku = $sku,
            i.price = $price,
            i.quantity = coalesce(i.quantity, 0) + $quantity,
            i.updated_at = timestamp(),
            i.embedding = $embedding
        
        MERGE (r:Room {name: $room})
        ON CREATE SET r.embedding = $room_embedding
        
        MERGE (i)-[rel:LOCATED_IN]->(r)
        ON CREATE SET rel.since = $add_date
        ON MATCH SET rel.last_updated = $add_date
        """

        try:
            with self.driver.session() as session:
                session.run(query, **item_data)
            logging.debug(f"Neo4j upsert successful for item {item_data['name']} in room {item_data['room']}")
        except Exception as e:
            logging.error(f"Neo4j upsert error: {e}")

    def search_similar_items(self, query_text: str, limit: int = 5):
        """
        Search for similar items using vector similarity
        """
        embeddings_client = EmbeddingsClient()
        query_embedding = embeddings_client.get_text_embedding(query_text)

        cypher_query = """
        MATCH (i:InventoryItem)
        WHERE i.embedding IS NOT NULL
        WITH i, gds.similarity.cosine(i.embedding, $query_embedding) AS similarity
        WHERE similarity > 0.7
        RETURN i.name, i.price, i.room, similarity
        ORDER BY similarity DESC
        LIMIT $limit
        """

        with self.driver.session() as session:
            result = session.run(cypher_query, query_embedding=query_embedding, limit=limit)
            return [dict(record) for record in result]

    def initialize_database(self):
        """Initialize database schema and indexes"""
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        init_queries = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (i:InventoryItem) REQUIRE i.item_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Room) REQUIRE r.name IS UNIQUE",
            """CREATE VECTOR INDEX item_embedding IF NOT EXISTS
            FOR (i:InventoryItem)
            ON (i.embedding)
            OPTIONS {
                indexConfig: {
                    `vector.dimensions`: 1536,
                    `vector.similarity_function`: 'cosine'
                }
            }""",
            """CREATE VECTOR INDEX room_embedding IF NOT EXISTS
            FOR (r:Room)
            ON (r.embedding)
            OPTIONS {
                indexConfig: {
                    `vector.dimensions`: 1536,
                    `vector.similarity_function`: 'cosine'
                }
            }""",
        ]

        try:
            with self.driver.session() as session:
                for query in init_queries:
                    session.run(query)
            logging.info("Neo4j schema and indexes initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing Neo4j schema: {e}")
