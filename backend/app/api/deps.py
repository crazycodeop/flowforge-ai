from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User | None:
    """Extracts and verifies current user from bearer token. Returns None if unauthenticated."""
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    return user


def require_user(user: Annotated[User | None, Depends(get_current_user)]) -> User:
    """Enforces authentication; raises 401 Unauthorized if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(allowed_roles: list[str]) -> Callable[[User], User]:
    """Factory creating dependency to check user role permissions."""

    def role_dependency(user: Annotated[User, Depends(require_user)]) -> User:
        if user.role not in allowed_roles and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {allowed_roles}. Current role: '{user.role}'.",
            )
        return user

    return role_dependency
