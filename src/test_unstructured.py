from src.unstructured_client import UnstructuredClient
import json


def test_receipt_processing():
    client = UnstructuredClient()

    # Replace with path to your test receipt image
    test_image_path = "test_receipt.jpg"

    try:
        # Process the receipt
        print("Processing receipt...")
        result = client.process_receipt(test_image_path)

        # Print the raw response in a readable format
        print("\nRaw Response:")
        print(json.dumps(result, indent=2))

        # Extract the data
        print("\nExtracted Data:")
        extracted = client.extract_receipt_data(result)
        print(json.dumps(extracted, indent=2))

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    test_receipt_processing()
