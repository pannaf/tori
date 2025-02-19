from neo4j import GraphDatabase
import logging
import uuid

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
        Upserts an inventory item node and creates/updates its relationship to a room.
        Expects item_data to have:
          - item_id (id from QuickBooks)
          - name
          - sku
          - price
          - quantity
          - add_date
          - purchase_date (optional)
          - room (the room classification)
        """
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        # Generate a unique id for this transaction
        item_data["transaction_id"] = str(uuid.uuid4())

        query = """
        // First MERGE the item
        MERGE (i:InventoryItem {item_id: $item_id})
        ON CREATE SET 
            i.name = $name,
            i.sku = $sku,
            i.price = $price,
            i.quantity = $quantity,
            i.add_date = $add_date,
            i.purchase_date = $purchase_date,
            i.created_at = timestamp()
        ON MATCH SET 
            i.name = $name,
            i.sku = $sku,
            i.price = $price,
            i.quantity = coalesce(i.quantity, 0) + $quantity,
            i.updated_at = timestamp()
        
        // Then MERGE the room
        MERGE (r:Room {name: $room})
        
        // Create or update the relationship
        MERGE (i)-[rel:LOCATED_IN]->(r)
        ON CREATE SET rel.since = $add_date
        ON MATCH SET rel.last_updated = $add_date
        """
        try:
            with self.driver.session() as session:
                session.write_transaction(lambda tx: tx.run(query, **item_data))
            logging.debug(f"Neo4j upsert successful for item {item_data['name']} in room {item_data['room']}")
        except Exception as e:
            logging.error(f"Neo4j upsert error: {e}")
