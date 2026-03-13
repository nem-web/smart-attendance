"""
Rate limiting utilities for file uploads and other sensitive operations.
Implements sliding window rate limiting with Redis backend.
"""

import os
import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
import redis
import json

logger = logging.getLogger(__name__)

class RateLimiter:
    """Redis-based rate limiter with sliding window algorithm."""
    
    def __init__(self, redis_url: str = ""):
        self.redis_client = None
        self._memory_store = {}
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                logger.info("Connected to Redis for rate limiting")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using in-memory fallback.")
                self.redis_client = None
        else:
            logger.info("Redis not configured. Using in-memory cache.")
    
    def _get_key(self, identifier: str, operation: str) -> str:
        """Generate Redis key for rate limiting."""
        return f"rate_limit:{operation}:{identifier}"
    
    def _cleanup_memory_store(self):
        """Clean up expired entries from memory store."""
        current_time = time.time()
        expired_keys = []
        
        for key, data in self._memory_store.items():
            # Remove entries older than 1 hour
            if current_time - data.get('last_access', 0) > 3600:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._memory_store[key]
    
    async def check_rate_limit(
        self,
        identifier: str,
        operation: str,
        max_requests: int,
        window_seconds: int,
        request: Optional[Request] = None
    ) -> Dict[str, Any]:
        """
        Check if request is within rate limits.
        
        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            operation: Operation type (upload, login, etc.)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            request: FastAPI request object for additional context
            
        Returns:
            Dictionary with rate limit status and metadata
        """
        current_time = time.time()
        key = self._get_key(identifier, operation)
        
        if self.redis_client:
            return await self._check_redis_rate_limit(
                key, max_requests, window_seconds, current_time
            )
        else:
            return self._check_memory_rate_limit(
                key, max_requests, window_seconds, current_time
            )
    
    async def _check_redis_rate_limit(
        self, key: str, max_requests: int, window_seconds: int, current_time: float
    ) -> Dict[str, Any]:
        """Redis-based rate limiting implementation."""
        try:
            pipe = self.redis_client.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, current_time - window_seconds)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window_seconds + 60)  # Extra buffer
            
            results = pipe.execute()
            current_count = results[1] + 1  # +1 for the request we just added
            
            if current_count > max_requests:
                # Remove the request we just added since it's rejected
                self.redis_client.zrem(key, str(current_time))
                
                # Get oldest request time for reset calculation
                oldest_requests = self.redis_client.zrange(key, 0, 0, withscores=True)
                reset_time = None
                if oldest_requests:
                    reset_time = oldest_requests[0][1] + window_seconds
                
                return {
                    'allowed': False,
                    'current_count': current_count - 1,
                    'max_requests': max_requests,
                    'window_seconds': window_seconds,
                    'reset_time': reset_time,
                    'retry_after': int(reset_time - current_time) if reset_time else window_seconds
                }
            
            return {
                'allowed': True,
                'current_count': current_count,
                'max_requests': max_requests,
                'window_seconds': window_seconds,
                'remaining': max_requests - current_count
            }
            
        except Exception as e:
            logger.error(f"Redis rate limiting error: {e}")
            # Fallback to allowing request on Redis errors
            return {
                'allowed': True,
                'current_count': 0,
                'max_requests': max_requests,
                'window_seconds': window_seconds,
                'error': str(e)
            }
    
    def _check_memory_rate_limit(
        self, key: str, max_requests: int, window_seconds: int, current_time: float
    ) -> Dict[str, Any]:
        """In-memory fallback rate limiting implementation."""
        self._cleanup_memory_store()
        
        if key not in self._memory_store:
            self._memory_store[key] = {
                'requests': [],
                'last_access': current_time
            }
        
        data = self._memory_store[key]
        data['last_access'] = current_time
        
        # Remove expired requests
        cutoff_time = current_time - window_seconds
        data['requests'] = [req_time for req_time in data['requests'] if req_time > cutoff_time]
        
        current_count = len(data['requests'])
        
        if current_count >= max_requests:
            # Calculate reset time
            oldest_request = min(data['requests']) if data['requests'] else current_time
            reset_time = oldest_request + window_seconds
            
            return {
                'allowed': False,
                'current_count': current_count,
                'max_requests': max_requests,
                'window_seconds': window_seconds,
                'reset_time': reset_time,
                'retry_after': int(reset_time - current_time)
            }
        
        # Add current request
        data['requests'].append(current_time)
        
        return {
            'allowed': True,
            'current_count': current_count + 1,
            'max_requests': max_requests,
            'window_seconds': window_seconds,
            'remaining': max_requests - current_count - 1
        }


# Rate limiting configurations for different operations
RATE_LIMIT_CONFIGS = {
    'file_upload': {
        'max_requests': 10,  # 10 uploads per hour per user
        'window_seconds': 3600,
        'error_message': 'Too many file uploads. Please try again later.'
    },
    'avatar_upload': {
        'max_requests': 5,   # 5 avatar changes per hour per user
        'window_seconds': 3600,
        'error_message': 'Too many avatar uploads. Please try again later.'
    },
    'face_image_upload': {
        'max_requests': 20,  # 20 face image attempts per hour per user
        'window_seconds': 3600,
        'error_message': 'Too many face image uploads. Please try again later.'
    }
}


async def enforce_upload_rate_limit(
    user_id: str,
    operation: str,
    request: Optional[Request] = None,
    rate_limiter: Optional[RateLimiter] = None
):
    """
    Enforce rate limiting for upload operations.
    
    Args:
        user_id: User identifier
        operation: Operation type (must be in RATE_LIMIT_CONFIGS)
        request: FastAPI request object
        rate_limiter: RateLimiter instance (uses global upload_rate_limiter if None)
        
    Raises:
        HTTPException: If rate limit is exceeded
    """
    if operation not in RATE_LIMIT_CONFIGS:
        logger.warning(f"Unknown rate limit operation: {operation}")
        return
    
    config = RATE_LIMIT_CONFIGS[operation]
    
    if rate_limiter is None:
        rate_limiter = upload_rate_limiter
    
    result = await rate_limiter.check_rate_limit(
        identifier=user_id,
        operation=operation,
        max_requests=config['max_requests'],
        window_seconds=config['window_seconds'],
        request=request
    )
    
    if not result['allowed']:
        logger.warning(
            f"Rate limit exceeded for user {user_id}, operation {operation}: "
            f"{result['current_count']}/{config['max_requests']}"
        )
        
        raise HTTPException(
            status_code=429,
            detail=config['error_message'],
            headers={
                'X-RateLimit-Limit': str(config['max_requests']),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': str(int(result.get('reset_time', time.time() + config['window_seconds']))),
                'Retry-After': str(result.get('retry_after', config['window_seconds']))
            }
        )
    
    logger.info(
        f"Rate limit check passed for user {user_id}, operation {operation}: "
        f"{result['current_count']}/{config['max_requests']}"
    )


# Global rate limiter instance
upload_rate_limiter = RateLimiter(redis_url=os.getenv("REDIS_URL", ""))