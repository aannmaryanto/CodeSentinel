from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.users import User
from app.schemas.auth import UserRegisterRequest
from app.core.security import hash_password, verify_password


async def register_user(db: AsyncSession, register_data: UserRegisterRequest) -> User:
    """
    Registers a new user after validating email uniqueness and hashing password.
    """
    normalized_email = register_data.email.lower().strip()

    # Check for existing email
    stmt = select(User).where(User.email == normalized_email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Hash plain-text password
    hashed_pwd = hash_password(register_data.password)

    # Create new User model instance
    user = User(
        name=register_data.name.strip(),
        display_name=register_data.name.strip(),
        email=normalized_email,
        hashed_password=hashed_pwd,
        role="developer",
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """
    Authenticates user by verifying email and password hash.
    Raises HTTPException(401) on invalid credentials.
    """
    normalized_email = email.lower().strip()

    stmt = select(User).where(User.email == normalized_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user
