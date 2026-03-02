import os
import secrets
from typing import Optional, List, Union
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,
    AuthenticatorTransport,
)
from app.db.mongo import db
from datetime import datetime
from bson import ObjectId

def get_rp_id(origin: str) -> str:
    from urllib.parse import urlparse
    if not origin:
        return "localhost"
    parsed = urlparse(origin)
    return parsed.hostname or "localhost"

async def generate_reg_options(user: dict, rp_id: str, rp_name: str = "Smart Attendance"):
    exclude_credentials = []
    if "webauthn_credentials" in user:
        for cred in user["webauthn_credentials"]:
            try:
                cred_id_bytes = base64url_to_bytes(cred["credential_id"])
                exclude_credentials.append({  # Correct structure for PyWebAuthn
                    "id": cred_id_bytes,
                    "type": "public-key",
                    "transports": cred.get("transports", []),
                })
            except Exception:
                pass # Ignore malformed credentials

    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_id=str(user["_id"]).encode(),
        user_name=user["email"],
        user_display_name=user["name"],
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            user_verification=UserVerificationRequirement.REQUIRED,
            resident_key=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=exclude_credentials,
    )
    
    # Store challenge as string (base64url)
    # options.challenge is bytes in newer versions of webauthn library? 
    # Actually generate_registration_options returns PublicKeyCredentialCreationOptions object.
    # The challenge is bytes. We need to store it to verify later.
    # We can store the bytes directly if using pymongo binary, or base64 encode it.
    # The `verify_registration_response` expects bytes for `expected_challenge`.
    
    import base64
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode('ascii').rstrip('=')
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"current_challenge": challenge_b64}}
    )

    return options

async def verify_reg_response(user: dict, response: RegistrationCredential, origin: str, rp_id: str):
    expected_challenge = user.get("current_challenge")
    if not expected_challenge:
        raise ValueError("No registration challenge found")

    try:
        # Pymongo stores as string, we need bytes for webauthn
        expected_challenge_bytes = base64url_to_bytes(expected_challenge)
        
        verification = verify_registration_response(
            credential=response,
            expected_challenge=expected_challenge_bytes,
            expected_origin=origin,
            expected_rp_id=rp_id,
            require_user_verification=True,
        )
    except Exception as e:
        raise ValueError(f"Registration verification failed: {e}")

    # Process and encode credential data for storage
    import base64
    
    # credential_id and credential_public_key are bytes, need to be stored as base64url strings
    cred_id_b64 = base64.urlsafe_b64encode(verification.credential_id).decode('ascii').rstrip('=')
    pub_key_b64 = base64.urlsafe_b64encode(verification.credential_public_key).decode('ascii').rstrip('=')

    credential_data = {
        "credential_id": cred_id_b64,
        "public_key": pub_key_b64,
        "sign_count": verification.sign_count,
        "transports": response.response.transports or [],
        "created_at": datetime.utcnow(),
    }

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$push": {"webauthn_credentials": credential_data},
            "$unset": {"current_challenge": ""}
        }
    )
    return credential_data

async def generate_auth_options(user: dict, rp_id: str):
    allow_credentials = []
    if "webauthn_credentials" in user:
        for cred in user["webauthn_credentials"]:
            try:
                # Ensure we have a string for credential_id base64url
                cid = cred["credential_id"]
                if isinstance(cid, bytes):
                    cid = cid.decode('utf-8')
                
                # Convert transports if they exist
                transports = []
                if cred.get("transports"):
                    # Webauthn expects AuthenticatorTransport enum if possible or strings
                    # The library usually handles strings if passed to AuthenticatorTransport
                    for t in cred.get("transports"):
                         try:
                             transports.append(AuthenticatorTransport(t))
                         except ValueError:
                             pass 

                allow_credentials.append(PublicKeyCredentialDescriptor(
                    id=base64url_to_bytes(cid),
                    transports=transports if transports else None
                ))
            except Exception as e:
                print(f"Skipping credential due to error: {e}")
                pass

    if not allow_credentials:
         # If no credentials, we can't authenticate with specific credentials.
         # But maybe we want to allow resident keys? 
         # For this specific flow (attendance), the user is logged in, so we know who they are.
         # We want to verify *their* registered authenticator.
         raise ValueError("No biometric credentials registered")

    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    import base64
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode('ascii').rstrip('=')
    
    print(f"DEBUG: Setting challenge for user {user['_id']}: {challenge_b64}")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"current_challenge": challenge_b64}}
    )

    return options

async def verify_auth_response(user: dict, response: AuthenticationCredential, origin: str, rp_id: str):
    print(f"DEBUG: Verifying user {user['_id']}. Challenge in DB: {user.get('current_challenge')} (type: {type(user.get('current_challenge'))})")
    
    expected_challenge = user.get("current_challenge")

    # If expected_challenge is missing, maybe try fetching user directly here to be sure
    if not expected_challenge:
        fresh_user = await db.users.find_one({"_id": user["_id"]})
        if fresh_user:
             print(f"DEBUG: Found challenge in fresh user fetch: {fresh_user.get('current_challenge')}")
             expected_challenge = fresh_user.get("current_challenge")
             user = fresh_user # update reference
        else:
             print("DEBUG: Still no challenge found after re-fetch.")

    if not expected_challenge:
        # Emergency log to see what the user object actually contains
        print(f"DEBUG: User object keys: {user.keys()}")
        raise ValueError("No authentication challenge found")

    # Find credential public key
    # response.id is base64url encoded string in the Pydantic model usually
    credential_id = response.id 
    
    credential = None
    if "webauthn_credentials" in user:
        for cred in user["webauthn_credentials"]:
            if cred["credential_id"] == credential_id:
                credential = cred
                break
    
    if not credential:
        # Fallback: check raw_id if it helps (it's bytes)
        raw_id_b64 = base64.urlsafe_b64encode(response.raw_id).decode('ascii').rstrip('=')
        for cred in user.get("webauthn_credentials", []):
             if cred["credential_id"] == raw_id_b64:
                credential = cred
                break
    
    if not credential:
        raise ValueError(f"Credential not registered. ID: {credential_id}")

    try:
        verification = verify_authentication_response(
            credential=response,
            expected_challenge=base64url_to_bytes(expected_challenge),
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=base64url_to_bytes(credential["public_key"]),
            credential_current_sign_count=credential["sign_count"],
            require_user_verification=True,
        )
    except Exception as e:
        raise ValueError(f"Authentication verification failed: {e}")

    # Update sign count
    await db.users.update_one(
        {"_id": user["_id"], "webauthn_credentials.credential_id": credential["credential_id"]},
        {"$set": {"webauthn_credentials.$.sign_count": verification.new_sign_count, "current_challenge": ""}} # Clear challenge
    )
    # Note: clearing challenge prevents replay but might cause issues if verification fails and we want to retry? 
    # Standard practice is to generate new challenge on retry.
    
    return verification
