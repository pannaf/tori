from intuitlib.client import AuthClient
import os
from dotenv import load_dotenv
import webbrowser
from intuitlib.enums import Scopes

load_dotenv()


def setup_quickbooks():
    client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
    client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")

    auth_client = AuthClient(
        client_id=client_id,
        client_secret=client_secret,
        environment="sandbox",
        redirect_uri="https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl",
    )

    # Get authorization URL
    url = auth_client.get_authorization_url([Scopes.ACCOUNTING])

    # Open URL in browser
    print("\nOpening browser for QuickBooks authorization...")
    webbrowser.open(url)

    # Get authorization code from user
    print("\nAfter authorizing, copy the FULL callback URL from your browser")
    callback_url = input("Paste the full callback URL here: ")

    # Get tokens
    auth_client.get_bearer_token(callback_url)

    print("\nYour QuickBooks credentials:")
    print(f"Refresh Token: {auth_client.refresh_token}")
    print(f"Realm ID: {auth_client.realm_id}")

    print("\nAdd these to your .env file!")


if __name__ == "__main__":
    setup_quickbooks()
