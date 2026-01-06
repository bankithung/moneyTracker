from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.tokens import Token
from .models import User
import logging

logger = logging.getLogger(__name__)


class CustomJWTAuthentication(JWTAuthentication):
    """Custom JWT authentication that uses our custom User model instead of Django's auth.User"""
    
    def get_user(self, validated_token):
        """
        Override to lookup user in our custom User model instead of Django's auth.User
        """
        try:
            user_id = validated_token.get('user_id')
            if not user_id:
                raise InvalidToken('Token contained no recognizable user identification')
            
            user = User.objects.get(id=user_id)
            return user
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found', code='user_not_found')
        except Exception as e:
            logger.error(f"CustomJWTAuthentication error: {e}")
            raise AuthenticationFailed('Invalid token', code='invalid_token')
