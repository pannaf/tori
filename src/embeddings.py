from openai import OpenAI
from PIL import Image
import base64
import io


class EmbeddingsClient:
    def __init__(self):
        self.client = OpenAI()

    def get_text_embedding(self, text: str) -> list[float]:
        """Get embedding for text using OpenAI's text-embedding-3-small model"""
        response = self.client.embeddings.create(input=text, model="text-embedding-3-small")
        return response.data[0].embedding

    def get_image_embedding(self, image_path: str = None, image_data: bytes = None) -> list[float]:
        """Get embedding for image using OpenAI's Vision model"""
        if image_path:
            with open(image_path, "rb") as image_file:
                image_data = image_file.read()

        if not image_data:
            raise ValueError("Either image_path or image_data must be provided")

        base64_image = base64.b64encode(image_data).decode("utf-8")

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Generate a detailed description of this image for embedding purposes."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                    ],
                }
            ],
            max_tokens=300,
        )

        description = response.choices[0].message.content
        return self.get_text_embedding(description)
