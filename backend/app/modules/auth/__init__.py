"""
Auth module init
"""
from app.modules.auth.jwt import jwt_service
from app.modules.auth.otp import otp_service

__all__ = ["jwt_service", "otp_service"]
