from openai import OpenAI
import os
import json
from typing import List, Union, Optional
import io


class ChatClient:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def get_llm_response(self, context: str, query: str) -> str:
        """Get a response using OpenAI's API"""
        try:
            print("\n=== DEBUG: Starting get_llm_response ===")

            # Format the prompt
            messages = [
                {"role": "system", "content": "You are a helpful inventory assistant. Answer questions based on the provided context."},
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {query}\n\nPlease answer based on the context provided.",
                },
            ]

            # Get completion from OpenAI
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo", messages=messages, temperature=0.7, max_tokens=500  # or "gpt-4" if you have access
            )

            # Extract the response text
            return response.choices[0].message.content

        except Exception as e:
            print(f"Failed to get response: {str(e)}")
            raise Exception(f"Failed to get response: {str(e)}")
