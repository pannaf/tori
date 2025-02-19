import os
import requests
from openai import OpenAI

import json
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()


class UnstructuredClient:
    def __init__(self):
        self.api_key = os.getenv("UNSTRUCTURED_API_KEY")
        if not self.api_key:
            raise ValueError("UNSTRUCTURED_API_KEY not found in environment variables")

        self.api_url = "https://api.unstructuredapp.io/general/v0/general"
        self.headers = {"Accept": "application/json", "unstructured-api-key": self.api_key}

    def process_receipt(self, image_path: str) -> Dict[str, Any]:
        """
        Process a receipt image using Unstructured.io API

        Args:
            image_path (str): Path to the receipt image file

        Returns:
            Dict[str, Any]: Structured data extracted from the receipt

        Raises:
            Exception: If the API request fails
        """
        try:
            with open(image_path, "rb") as f:
                files = {"files": (os.path.basename(image_path), f, "image/jpeg")}
                response = requests.post(self.api_url, headers=self.headers, files=files)

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to process receipt: {str(e)}")

    def extract_receipt_data(self, structured_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant information from the structured receipt data

        Args:
            structured_data (Dict[str, Any]): Raw structured data from Unstructured.io

        Returns:
            Dict[str, Any]: Extracted receipt information including:
                - items: List of items with quantities and prices
                - total: Total amount
                - date: Receipt date
                - vendor: Store/vendor name
        """
        # Assume the API returns a list (as in your snippet) and extract the first element's text.
        receipt_text = None
        if isinstance(structured_data, list) and structured_data:
            receipt_text = structured_data[0].get("text")

        if not receipt_text:
            raise ValueError("No receipt text found in the API response.")

        # Use LLM to parse the receipt text into structured data.
        try:
            parsed_data = self.extract_receipt_data_with_llm(receipt_text)
            return parsed_data
        except Exception as e:
            raise Exception(f"Failed to process receipt data via LLM: {e}")

    def extract_receipt_data_with_llm(self, receipt_text: str) -> Dict[str, Any]:
        """
        Uses an LLM to extract structured receipt data from raw text output.

        Args:
            receipt_text (str): The raw text extracted from the receipt image.

        Returns:
            Dict[str, Any]: JSON with keys 'items', 'total', 'date', and 'vendor'.
        """
        prompt = f"""
Extract the following information from the receipt text as JSON:
- Items: a list of items with name, quantity, and price (if available).
- Total: the total amount charged.
- Date: the date of the receipt.
- Vendor: the store/vendor name.

Note that the date is typically in the format "MM/DD/YYYY" though it may be written as "MM7DD7YYYY". Look for it near the time of day.
For example, "0271872025 11:41 AM" is 02/18/2025.
Also, map the product to a retailer product. There may be some OCR errors, where G looks like a Q.

Receipt text: 
{receipt_text}

Return the JSON with keys "items", "total", "date", and "vendor".
Do not include any additional commentary or explanation.
"""
        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}], temperature=0.0)
        llm_content = response.choices[0].message.content

        try:
            print(llm_content)
            return json.loads(llm_content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Error decoding LLM response: {llm_content}") from e
