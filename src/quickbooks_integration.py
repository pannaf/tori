from quickbooks import QuickBooks
from quickbooks.objects.item import Item
from quickbooks.objects.account import Account
from intuitlib.client import AuthClient
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)


class QuickBooksInventory:
    def __init__(self):
        load_dotenv()
        self.client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
        self.client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")
        self.refresh_token = os.getenv("QUICKBOOKS_REFRESH_TOKEN")
        self.realm_id = os.getenv("QUICKBOOKS_REALM_ID")
        self.environment = os.getenv("QUICKBOOKS_ENVIRONMENT", "sandbox")

        self.auth_client = AuthClient(
            client_id=self.client_id,
            client_secret=self.client_secret,
            environment=self.environment,
            redirect_uri="https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl",
        )
        self.setup_client()

    def setup_client(self):
        """Initialize QuickBooks client with OAuth tokens"""
        self.auth_client.refresh(refresh_token=self.refresh_token)
        self.client = QuickBooks(
            auth_client=self.auth_client, refresh_token=self.refresh_token, company_id=self.realm_id, minorversion=65
        )

    def add_detected_item(self, detection_data):
        try:
            # Convert price to float if provided as string with '$'
            provided_price = detection_data.get("price", 10.00)
            if isinstance(provided_price, str):
                provided_price = float(provided_price.replace("$", "").strip())

            # Default prices for common items (in USD)
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

            # Use mapped default price if available, otherwise use provided price
            base_name = detection_data["classLabel"].lower()
            price = DEFAULT_PRICES.get(base_name, provided_price)

            # Create a unique identifier based on item type and price point
            item_name = f"{base_name} (${price:.2f})"
            print(f"\nProcessing detected item: {item_name}")

            # Skip if the detected item is a person
            if base_name in ["person", "people", "human", "man", "woman", "child", "baby"]:
                print(f"Skipping detected {base_name} - people should not be added to inventory")
                return {"success": False, "error": "Cannot add people to inventory", "detected_type": base_name}

            # Try to find an existing item with same name
            existing_items = Item.filter(Type="Inventory", Name=item_name, qb=self.client)
            matching_items = [item for item in existing_items if float(item.UnitPrice) == float(price)]
            increment_amount = detection_data.get("quantity", 1)

            if matching_items:
                # Found an exact match, increment quantity by the provided amount
                item = matching_items[0]
                item.QtyOnHand += increment_amount
                print(f"Incrementing quantity for existing item: {item.Name} by {increment_amount}")
                item.save(qb=self.client)
                return {
                    "success": True,
                    "item_id": item.Id,
                    "name": item.Name,
                    "action": "incremented",
                    "price": price,
                }

            # If no exact match found, create new item
            print(f"Creating new item: {item_name}")
            item = Item()

            # Set basic item properties
            item.Name = item_name
            item.Description = (
                f"Auto-detected {base_name} at ${price:.2f} price point "
                f"(First detected with confidence: {detection_data['confidence']:.1%})"
            )

            # Optional: Set SKU for better inventory management
            sku = f"{base_name.lower().replace(' ', '-')}-{int(price):03d}"
            item.Sku = sku

            # Set inventory tracking
            item.Type = "Inventory"
            item.TrackQtyOnHand = True
            item.QtyOnHand = increment_amount
            item.InvStartDate = datetime.now().strftime("%Y-%m-%d")

            # Set pricing field (estimated value)
            item.UnitPrice = price

            # Get required accounts
            income_account = self._get_or_create_account("Income", "SalesOfProductIncome")
            expense_account = self._get_or_create_account("Cost of Goods Sold", "CostOfGoodsSold")
            asset_account = self._get_or_create_account("Other Current Asset", "Inventory")

            print(f"Using accounts - Income: {income_account.Name}, Expense: {expense_account.Name}, Asset: {asset_account.Name}")

            item.IncomeAccountRef = income_account.to_ref()
            item.ExpenseAccountRef = expense_account.to_ref()
            item.AssetAccountRef = asset_account.to_ref()

            print("Saving new item to QuickBooks...")
            item.save(qb=self.client)
            print(f"Successfully saved item: {item.Name}")

            return {
                "success": True,
                "item_id": item.Id,
                "name": item.Name,
                "action": "created",
                "price": price,
                "sku": sku,
            }

        except Exception as e:
            print(f"Error processing item: {str(e)}")
            return {"success": False, "error": str(e)}

    def _get_or_create_account(self, account_type, account_subtype):
        """Get or create a QuickBooks account by type"""
        try:
            # Map of valid QuickBooks account subtypes for filtering/creation.
            # (For Cost of Goods Sold, we'll avoid filtering by AccountSubType)
            FILTER_SUBTYPES = {
                "Income": "SalesOfProductIncome",
                "Cost of Goods Sold": "CostOfGoodsSold",  # For creation, we still set this.
                "Other Current Asset": "Inventory",
            }
            CREATE_SUBTYPES = {
                "Income": "SalesOfProductIncome",
                "Cost of Goods Sold": "CostOfGoodsSold",
                "Other Current Asset": "Inventory",
            }

            filter_subtype = FILTER_SUBTYPES.get(account_type)
            create_subtype = CREATE_SUBTYPES.get(account_type)

            if not filter_subtype or not create_subtype:
                raise Exception(f"Invalid account type: {account_type}")

            # Log what we're about to query.
            print(f"DEBUG: Querying account. AccountType: {account_type}, AccountSubType: {filter_subtype}")

            # For a Cost of Goods Sold account, skip filtering by AccountSubType.
            if account_type == "Cost of Goods Sold":
                accounts = Account.filter(AccountType=account_type, qb=self.client)
            else:
                accounts = Account.filter(AccountType=account_type, AccountSubType=filter_subtype, qb=self.client)

            if accounts:
                print(f"Found existing account: {accounts[0].Name}")
                return accounts[0]

            print(f"Creating new account: Auto Detected Items {account_type}")
            # Create new account if none exists.
            account = Account()
            account.Name = f"Auto Detected Items {account_type}"
            account.AccountType = account_type
            account.AccountSubType = create_subtype
            account.save(qb=self.client)
            return account

        except Exception as e:
            print(f"DEBUG: Error with account {account_type}: {str(e)}")
            raise Exception(f"Error setting up {account_type} account: {str(e)}")

    def get_inventory_report(self, report_type="InventoryValuationSummary"):
        """
        Fetch inventory-related reports from QuickBooks
        """
        try:
            # The Report API endpoint with minorversion
            report = self.client.get_report(report_type)

            print(f"Fetched {report_type} report")

            # Handle the report as a dictionary
            if isinstance(report, dict):
                # Extract relevant data from the dictionary structure
                header = report.get("Header", {})
                rows = report.get("Rows", {}).get("Row", [])

                # Process the rows to extract the data we need
                processed_rows = []
                for row in rows:
                    # Skip summary rows (like TOTAL)
                    if not row.get("group"):
                        cols = row.get("ColData", [])
                        if len(cols) >= 5:  # Ensure we have enough columns
                            # Clean and convert numeric values
                            # Column order from docs:
                            # 0: Item name
                            # 1: SKU
                            # 2: Qty
                            # 3: Asset Value (Total Value)
                            # 4: Avg Cost (Unit Price)
                            qty = float(cols[2].get("value", "0").replace(",", ""))
                            total_value = float(cols[3].get("value", "0").replace("$", "").replace(",", ""))
                            unit_price = float(cols[4].get("value", "0").replace("$", "").replace(",", ""))

                            processed_row = {
                                "Item": cols[0].get("value", ""),
                                "SKU": cols[1].get("value", ""),
                                "QtyOnHand": qty,
                                "UnitPrice": unit_price,
                                "Value": total_value,
                            }
                            processed_rows.append(processed_row)

                return {"success": True, "rows": processed_rows, "header": header}

            return {"success": False, "error": "Unexpected report format"}

        except Exception as e:
            print(f"Error fetching report: {str(e)}")
            return {"success": False, "error": str(e)}

    def add_receipt_item(self, item: dict) -> dict:
        """
        Adds an item extracted from a receipt to the QuickBooks inventory,
        processing it in the same manner as detected items from photos.
        """
        try:
            # Get the price value, it might be a string (with a "$") or a float.
            price_val = item.get("price", "10.00")
            if isinstance(price_val, str):
                price = float(price_val.replace("$", "").strip())
            else:
                price = float(price_val)

            detection_data = {
                "classLabel": item.get("name"),
                "price": price,
                "quantity": item.get("quantity", 1),
                "confidence": 1.0,  # Receipt items assume full confidence
            }
            # Reuse the same logic as add_detected_item to create or update the item
            return self.add_detected_item(detection_data)
        except Exception as e:
            print(f"Error processing receipt item: {str(e)}")
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    qb = QuickBooksInventory()
    qb.setup_client()  # or override setup_client if you want to avoid auto-refresh
    try:
        print("DEBUG: Querying for Cost of Goods Sold account")
        # Try querying only by AccountType first (without the AccountSubType filter)
        accounts = Account.filter(AccountType="Cost of Goods Sold", qb=qb.client)
        print(f"DEBUG: Query returned: {accounts}")
    except Exception as e:
        print("DEBUG: Query error:", e)
    qb.add_detected_item({"classLabel": "test", "confidence": 0.95})
