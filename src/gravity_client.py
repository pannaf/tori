import requests
import json
import io
import base64
from typing import List, Union, Optional
import tempfile
import os


class GravityAIClient:
    def __init__(self, api_key: str = "GAI-wmBiBQ7e.bm3OFeWHioeHUprWJ30ij218sF-GAc"):
        self.API_URL = "https://on-demand.gravity-ai.com/"
        self.API_CREATE_JOB_URL = self.API_URL + "api/v1/jobs"
        self.API_GET_JOB_RESULT_URL = self.API_URL + "api/v1/jobs/result-link"
        self.API_KEY = api_key

        self.headers = {"x-api-key": self.API_KEY}

        self.config = {
            "version": "0.0.1",
            "mimeType": "application/json; header=present",
        }

    def create_job(self, input_data: Union[str, bytes, io.BytesIO], is_file_path: bool = False) -> str:
        """Create a new job with either file path or data"""
        try:
            if is_file_path:
                files = {
                    "file": open(input_data, "rb"),
                }
            else:
                # If input_data is already bytes, use it directly
                if isinstance(input_data, bytes):
                    file_data = input_data
                # If it's a BytesIO object, get its contents
                elif isinstance(input_data, io.BytesIO):
                    file_data = input_data.getvalue()
                # If it's a string, encode it
                else:
                    file_data = input_data.encode("utf-8")

                files = {
                    "file": ("input.json", file_data, "application/json"),
                }

            data = {"data": json.dumps(self.config)}

            print(f"Sending request to GravityAI with files: {files}")

            response = requests.post(self.API_CREATE_JOB_URL, headers=self.headers, data=data, files=files)

            result = response.json()
            print(f"GravityAI response: {result}")

            if result.get("isError", False):
                raise Exception(f"Error: {result.get('errorMessage')}")

            if result.get("data", {}).get("statusMessage") != "success":
                raise Exception(f"Job Failed: {result.get('data', {}).get('errorMessage')}")

            return result.get("data", {}).get("id")

        finally:
            # Close file if it was opened
            if is_file_path and "files" in locals():
                files["file"].close()

    def get_job_result(self, job_id: str) -> bytes:
        """Get the result of a job"""
        url = f"{self.API_GET_JOB_RESULT_URL}/{job_id}"
        response = requests.get(url, headers=self.headers)
        link = response.json()

        if link.get("isError"):
            raise Exception(f"Error: {link.get('errorMessage')}")

        result = requests.get(link.get("data"))
        return result.content

    def process_text(self, text: str) -> dict:
        """Process a text string and return the result as a dictionary"""
        try:
            # Format the input data as a proper JSON file with headers
            input_data = {
                "inputs": [
                    {"role": "system", "content": "You are a helpful and friendly home inventory assistant."},
                    {"role": "user", "content": text},
                ]
            }

            # Convert to JSON string
            json_data = json.dumps(input_data, indent=2)

            print(f"Sending data to GravityAI: {json_data}")

            # Create a BytesIO object with the JSON data
            data_bytes = io.BytesIO(json_data.encode("utf-8"))

            job_id = self.create_job(data_bytes)
            result = self.get_job_result(job_id)
            return json.loads(result)
        except Exception as e:
            print(f"Error in process_text: {str(e)}")
            raise

    def process_file(self, file_path: str) -> dict:
        """Process a file and return the result as a dictionary"""
        job_id = self.create_job(file_path, is_file_path=True)
        result = self.get_job_result(job_id)
        return json.loads(result)

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a text string"""
        try:
            print(f"Getting embedding for text: {text}")
            input_data = {"inputs": {"text": text, "task": "embedding"}}
            json_data = json.dumps(input_data, indent=2)
            data_bytes = io.BytesIO(json_data.encode("utf-8"))

            job_id = self.create_job(data_bytes)
            result = self.get_job_result(job_id)
            result_dict = json.loads(result)

            print(f"Raw embedding result: {result_dict}")
            if not result_dict.get("embedding"):
                raise Exception("No embedding in response")
            return result_dict.get("embedding", [])
        except Exception as e:
            print(f"Failed to get embedding: {str(e)}")
            raise Exception(f"Failed to get embedding: {str(e)}")

    def chat_completion(self, prompt: str) -> str:
        """Get a chat completion response"""
        try:
            # Create input data in the exact format that worked
            input_data = {
                "dialog": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": prompt}],
                "max_gen_len": None,
                "temperature": 0.7,
                "top_p": 0.9,
            }

            # Write to a temporary input file
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                json.dump(input_data, f, indent=2)
                input_path = f.name

            output_path = input_path + ".out"

            try:
                # Keep the file open during the entire request, just like the example
                input_file = open(input_path, "rb")
                files = {
                    "file": input_file,
                }

                data = {"data": json.dumps(self.config)}

                response = requests.request("POST", self.API_CREATE_JOB_URL, headers=self.headers, data=data, files=files)

                # Close the file after the request is done
                input_file.close()

                result = response.json()
                if result.get("isError", False):
                    raise Exception(f"Error: {result.get('errorMessage')}")
                if result.get("data", {}).get("statusMessage") != "success":
                    raise Exception(f"Job Failed: {result.get('data', {}).get('errorMessage')}")

                job_id = result.get("data", {}).get("id")

                # Get result and write to output file exactly like the example
                url = f"{self.API_GET_JOB_RESULT_URL}/{job_id}"
                response = requests.request("GET", url, headers=self.headers)
                link = response.json()

                if link.get("isError"):
                    raise Exception(f"Error: {link.get('errorMessage')}")

                result = requests.request("GET", link.get("data"))

                # Write to output file like the example
                with open(output_path, "wb") as f:
                    f.write(result.content)

                # Read the response
                with open(output_path, "r") as f:
                    response_data = json.load(f)
                    print(f"API Response: {response_data}")
                    return str(response_data)

            finally:
                # Clean up temp files
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)

        except Exception as e:
            print(f"Error in chat completion: {str(e)}")
            return f"Error: {str(e)}"

    def process_image(self, image_data: Union[str, bytes], is_base64: bool = False) -> dict:
        """Process an image and return embeddings or analysis"""
        try:
            if is_base64:
                if isinstance(image_data, str):
                    # Remove potential base64 prefix
                    if "," in image_data:
                        image_data = image_data.split(",")[1]
                    image_bytes = base64.b64decode(image_data)
                else:
                    image_bytes = image_data
            else:
                if isinstance(image_data, str):
                    # Treat as file path
                    with open(image_data, "rb") as f:
                        image_bytes = f.read()
                else:
                    image_bytes = image_data

            job_id = self.create_job(image_bytes)
            result = self.get_job_result(job_id)
            return json.loads(result)
        except Exception as e:
            raise Exception(f"Failed to process image: {str(e)}")

    def get_llm_response(self, context: str, query: str) -> str:
        """Get a response using OpenAI's API"""
        try:
            print("\n=== DEBUG: Starting get_llm_response ===")

            # Import OpenAI here to avoid potential circular imports
            from openai import OpenAI

            # Initialize OpenAI client
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            # Format the prompt
            messages = [
                {"role": "system", "content": "You are a helpful inventory assistant. Answer questions based on the provided context."},
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {query}\n\nPlease answer based on the context provided.",
                },
            ]

            # Get completion from OpenAI
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", messages=messages, temperature=0.7, max_tokens=500  # or "gpt-4" if you have access
            )

            # Extract the response text
            return response.choices[0].message.content

        except Exception as e:
            print(f"Failed to get response: {str(e)}")
            raise Exception(f"Failed to get response: {str(e)}")
