from typing import Optional, List
from pydantic import BaseModel

class RegistrationOptionsResponse(BaseModel):
    publicKey: dict

class RegistrationResponse(BaseModel):
    credential: dict
    transports: Optional[List[str]] = None

class AuthenticateOptionsResponse(BaseModel):
    publicKey: dict

class AuthenticateResponse(BaseModel):
    credential: dict

class EnableBiometricResponse(BaseModel):
    success: bool
    message: str
