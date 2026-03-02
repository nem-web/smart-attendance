from fastapi import APIRouter, Depends, HTTPException, Request, Body, Response
from app.core.security import get_current_user
from app.db.mongo import db
from app.services.webauthn_service import (
    generate_reg_options,
    verify_reg_response,
    generate_auth_options,
    verify_auth_response,
    get_rp_id,
)
from webauthn.helpers import parse_registration_credential_json, parse_authentication_credential_json
from webauthn import options_to_json

from bson import ObjectId

router = APIRouter(prefix="/webauthn", tags=["WebAuthn"])

@router.post("/register/options")
async def register_options(request: Request, current_user: dict = Depends(get_current_user)):
    origin = request.headers.get("origin")
    rp_id = get_rp_id(origin)
    rp_name = "Smart Attendance" # Can be dynamic

    try:
        # Check if user already has a credential? Maybe allow multiple?
        # For now, allow multiple.
        
        # current_user from get_current_user only has {id, role, email}
        # We need the full user object for webauthn service
        user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
            
        options = await generate_reg_options(user_doc, rp_id, rp_name)
        return Response(content=options_to_json(options), media_type="application/json")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register/verify")
async def register_verify(request: Request, body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    origin = request.headers.get("origin")
    rp_id = get_rp_id(origin)
    
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        credential = parse_registration_credential_json(body)
        result = await verify_reg_response(user_doc, credential, origin, rp_id)
        return {"status": "success", "credential_id": result["credential_id"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/authenticate/options")
async def authenticate_options(request: Request, current_user: dict = Depends(get_current_user)):
    origin = request.headers.get("origin")
    rp_id = get_rp_id(origin)
    
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        # Start registration or auth
        options = await generate_auth_options(user_doc, rp_id)
        
        # Verify persistence immediately for debugging
        check_user = await db.users.find_one({"_id": user_doc["_id"]})
        print(f"[DEBUG] Auth Options Generated. Challenge set to: {check_user.get('current_challenge')}")

        return Response(content=options_to_json(options), media_type="application/json")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/authenticate/verify")
async def authenticate_verify(request: Request, body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    origin = request.headers.get("origin")
    rp_id = get_rp_id(origin)
    
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
            
        print(f"[DEBUG] Verify called for user {user_doc['_id']}. Current Challenge: {user_doc.get('current_challenge')}")

        credential = parse_authentication_credential_json(body)
        result = await verify_auth_response(user_doc, credential, origin, rp_id)
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
