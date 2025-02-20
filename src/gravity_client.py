import requests
import json
import io
import base64
from typing import List, Union, Optional

class GravityAIClient:
    def __init__(self, api_key: str = "GAI-wmBiBQ7e.bm3OFeWHioeHUprWJ30ij218sF-GAc"):
        self.API_URL = "https://on-demand.gravity-ai.com/"
        self.API_CREATE_JOB_URL = self.API_URL + 'api/v1/jobs'
        self.API_GET_JOB_RESULT_URL = self.API_URL + 'api/v1/jobs/result-link'
        self.API_KEY = api_key
        
        self.headers = {
            'x-api-key': self.API_KEY
        }
        
        self.config = {
            "version": "0.0.1",
            "mimeType": "application/json; header=present",
        }

    def create_job(self, input_data: Union[str, bytes, io.BytesIO], is_file_path: bool = False) -> str:
        """Create a new job with either file path or data"""
        try:
            if is_file_path:
                files = {
                    "file": open(input_data, 'rb'),
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
                    file_data = input_data.encode('utf-8')
                
                files = {
                    "file": ("input.json", file_data, "application/json"),
                }

            data = {
                'data': json.dumps(self.config)
            }
            
            print(f"Sending request to GravityAI with files: {files}")
            
            response = requests.post(
                self.API_CREATE_JOB_URL, 
                headers=self.headers, 
                data=data, 
                files=files
            )
            
            result = response.json()
            print(f"GravityAI response: {result}")
            
            if result.get('isError', False):
                raise Exception(f"Error: {result.get('errorMessage')}")
            
            if result.get('data', {}).get('statusMessage') != "success":
                raise Exception(f"Job Failed: {result.get('data', {}).get('errorMessage')}")
            
            return result.get('data', {}).get('id')
            
        finally:
            # Close file if it was opened
            if is_file_path and 'files' in locals():
                files['file'].close()

    def get_job_result(self, job_id: str) -> bytes:
        """Get the result of a job"""
        url = f"{self.API_GET_JOB_RESULT_URL}/{job_id}"
        response = requests.get(url, headers=self.headers)
        link = response.json()
        
        if link.get('isError'):
            raise Exception(f"Error: {link.get('errorMessage')}")
        
        result = requests.get(link.get('data'))
        return result.content

    def process_text(self, text: str) -> dict:
        """Process a text string and return the result as a dictionary"""
        try:
            # Format the input data as JSON
            input_data = {
                "text": text,
                "type": "text"
            }
            
            # Convert to JSON string
            json_data = json.dumps(input_data)
            
            print(f"Sending data to GravityAI: {json_data}")
            
            job_id = self.create_job(json_data)
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
            result = self.process_text(text)
            print(f"Raw embedding result: {result}")
            if not result.get('embedding'):
                raise Exception("No embedding in response")
            return result.get('embedding', [])
        except Exception as e:
            print(f"Failed to get embedding: {str(e)}")
            raise Exception(f"Failed to get embedding: {str(e)}")

    def chat_completion(self, prompt: str) -> str:
        """Get a chat completion response"""
        try:
            print(f"Getting chat completion for prompt: {prompt}")
            result = self.process_text(prompt)
            print(f"Raw completion result: {result}")
            if not result.get('response'):
                raise Exception("No response in result")
            return result.get('response', '')
        except Exception as e:
            print(f"Failed to get chat completion: {str(e)}")
            raise Exception(f"Failed to get chat completion: {str(e)}")

    def process_image(self, image_data: Union[str, bytes], is_base64: bool = False) -> dict:
        """Process an image and return embeddings or analysis"""
        try:
            if is_base64:
                if isinstance(image_data, str):
                    # Remove potential base64 prefix
                    if ',' in image_data:
                        image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                else:
                    image_bytes = image_data
            else:
                if isinstance(image_data, str):
                    # Treat as file path
                    with open(image_data, 'rb') as f:
                        image_bytes = f.read()
                else:
                    image_bytes = image_data

            job_id = self.create_job(image_bytes)
            result = self.get_job_result(job_id)
            return json.loads(result)
        except Exception as e:
            raise Exception(f"Failed to process image: {str(e)}")