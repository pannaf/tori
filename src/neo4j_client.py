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
        Inserts a new inventory item node in Neo4j.
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
        CREATE (i:InventoryItem {
            transaction_id: $transaction_id,
            item_id: $item_id,
            name: $name,
            sku: $sku,
            price: $price,
            quantity: $quantity,
            add_date: $add_date,
            purchase_date: $purchase_date,
            room: $room,
            created_at: timestamp()
        })
        """
        try:
            with self.driver.session() as session:
                session.write_transaction(lambda tx: tx.run(query, **item_data))
            logging.debug(f"Neo4j CREATE successful for item {item_data['name']}")
        except Exception as e:
            logging.error(f"Neo4j create error: {e}")

    def create_or_update_item(self, item_data):
        """
        Upserts an inventory item in Neo4j.
        Expecting item_data to have:
          - item_id (unique id from QuickBooks)
          - name
          - sku
          - price
          - quantity (the amount to add in this transaction)
        Uses MERGE and on-match incrementation.
        """
        if not self.driver:
            logging.warning("No Neo4j driver available.")
            return

        query = """
        MERGE (i:InventoryItem {item_id: $item_id})
        ON CREATE SET i.name = $name,
                      i.sku = $sku,
                      i.price = $price,
                      i.quantity = $quantity,
                      i.created_at = timestamp()
        ON MATCH SET i.quantity = coalesce(i.quantity, 0) + $quantity,
                     i.name = $name,
                     i.sku = $sku,
                     i.price = $price
        """
        try:
            with self.driver.session() as session:
                session.write_transaction(lambda tx: tx.run(query, **item_data))
            logging.debug(f"Neo4j upsert successful for item {item_data['name']}")
        except Exception as e:
            logging.error(f"Neo4j upsert error: {e}")
