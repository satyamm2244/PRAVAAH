import os
import time
import uuid

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from dotenv import load_dotenv

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    OAuth2PasswordBearer,
)

from jose import (
    JWTError,
    jwt,
)

from pwdlib import PasswordHash

from sqlalchemy.orm import Session

from database import get_db
from models import User


# =============================================================================
# ENVIRONMENT
# =============================================================================

load_dotenv()


# =============================================================================
# JWT CONFIGURATION
# =============================================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

if not JWT_SECRET_KEY:

    raise RuntimeError(
        "JWT_SECRET_KEY is missing. "
        "Add it to backend/.env."
    )


JWT_ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


# =============================================================================
# PASSWORD HASHING
# =============================================================================

password_hash = (
    PasswordHash.recommended()
)


# =============================================================================
# OAUTH TOKEN READER
# =============================================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


# =============================================================================
# PASSWORD HELPERS
# =============================================================================

def hash_password(
    password: str,
) -> str:

    if len(password) < 8:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 8 characters."
            ),
        )

    return password_hash.hash(
        password
    )


def verify_password(
    plain_password: str,
    stored_hash: str,
) -> bool:

    try:

        return (
            password_hash.verify(
                plain_password,
                stored_hash,
            )
        )

    except Exception:

        return False


# =============================================================================
# USER SERIALIZER
# =============================================================================

def user_to_dict(
    user: User,
):

    return {

        "id":
            user.id,

        "name":
            user.name,

        "email":
            user.email,

        "role":
            user.role,

        "status":
            user.status,

        "createdAt":
            user.created_at,

        "lastLoginAt":
            user.last_login_at,
    }


# =============================================================================
# NORMALIZE EMAIL
# =============================================================================

def normalize_email(
    email: str,
):

    return (
        email
        .strip()
        .lower()
    )


# =============================================================================
# CREATE ACCESS TOKEN
# =============================================================================

def create_access_token(
    user: User,
):

    expires_at = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            minutes=(
                ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )
    )


    payload = {

        "sub":
            user.id,

        "email":
            user.email,

        "role":
            user.role,

        "exp":
            expires_at,
    }


    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


# =============================================================================
# DECODE ACCESS TOKEN
# =============================================================================

def decode_access_token(
    token: str,
):

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[
                JWT_ALGORITHM
            ],
        )

        return payload

    except JWTError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid or expired "
                "authentication token."
            ),
            headers={
                "WWW-Authenticate":
                    "Bearer"
            },
        )


# =============================================================================
# FIND USER BY EMAIL
# =============================================================================

def get_user_by_email(
    db: Session,
    email: str,
):

    normalized_email = (
        normalize_email(
            email
        )
    )

    return (
        db.query(
            User
        )
        .filter(
            User.email
            == normalized_email
        )
        .first()
    )


# =============================================================================
# FIND USER BY ID
# =============================================================================

def get_user_by_id(
    db: Session,
    user_id: str,
):

    return (
        db.query(
            User
        )
        .filter(
            User.id
            == user_id
        )
        .first()
    )


# =============================================================================
# CREATE NORMAL USER
# =============================================================================

def create_normal_user(
    db: Session,
    name: str,
    email: str,
    password: str,
):

    clean_name = (
        name.strip()
    )

    normalized_email = (
        normalize_email(
            email
        )
    )


    # -------------------------------------------------------------------------
    # VALIDATE NAME
    # -------------------------------------------------------------------------

    if len(
        clean_name
    ) < 2:

        raise HTTPException(
            status_code=400,
            detail=(
                "Name must contain "
                "at least 2 characters."
            ),
        )


    # -------------------------------------------------------------------------
    # BASIC EMAIL VALIDATION
    # -------------------------------------------------------------------------

    if (
        "@"
        not in
        normalized_email
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Please provide a "
                "valid email address."
            ),
        )


    # -------------------------------------------------------------------------
    # DUPLICATE CHECK
    # -------------------------------------------------------------------------

    existing_user = (
        get_user_by_email(
            db,
            normalized_email,
        )
    )

    if existing_user:

        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this "
                "email already exists."
            ),
        )


    # -------------------------------------------------------------------------
    # CREATE USER
    # -------------------------------------------------------------------------

    new_user = User(

        id=str(
            uuid.uuid4()
        ),

        name=clean_name,

        email=normalized_email,

        password_hash=(
            hash_password(
                password
            )
        ),

        role="USER",

        status="ACTIVE",

        created_at=int(
            time.time()
            * 1000
        ),

        last_login_at=None,
    )


    try:

        db.add(
            new_user
        )

        db.commit()

        db.refresh(
            new_user
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create "
                "user account."
            ),
        )


    return new_user


# =============================================================================
# AUTHENTICATE USER
# =============================================================================

def authenticate_user(
    db: Session,
    email: str,
    password: str,
):

    user = (
        get_user_by_email(
            db,
            email,
        )
    )


    # -------------------------------------------------------------------------
    # ACCOUNT NOT FOUND
    # -------------------------------------------------------------------------

    if user is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Incorrect email or password."
            ),
        )


    # -------------------------------------------------------------------------
    # PASSWORD CHECK
    # -------------------------------------------------------------------------

    if not verify_password(
        password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Incorrect email or password."
            ),
        )


    # -------------------------------------------------------------------------
    # ACCOUNT STATUS
    # -------------------------------------------------------------------------

    if (
        user.status
        != "ACTIVE"
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This account is disabled."
            ),
        )


    # -------------------------------------------------------------------------
    # UPDATE LOGIN TIME
    # -------------------------------------------------------------------------

    user.last_login_at = int(
        time.time()
        * 1000
    )


    try:

        db.commit()

        db.refresh(
            user
        )

    except Exception:

        db.rollback()


    return user


# =============================================================================
# GET CURRENT AUTHENTICATED USER
# =============================================================================

def get_current_user(

    token: str = Depends(
        oauth2_scheme
    ),

    db: Session = Depends(
        get_db
    ),
):

    payload = (
        decode_access_token(
            token
        )
    )


    user_id = (
        payload.get(
            "sub"
        )
    )


    if not user_id:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Authentication token "
                "does not contain a user."
            ),
        )


    user = (
        get_user_by_id(
            db,
            user_id
        )
    )


    if user is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "User account no longer exists."
            ),
        )


    if (
        user.status
        != "ACTIVE"
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This account is disabled."
            ),
        )


    return user


# =============================================================================
# REQUIRE NORMAL AUTHENTICATED USER
# =============================================================================

def require_user(

    current_user: User = Depends(
        get_current_user
    ),
):

    return current_user


# =============================================================================
# REQUIRE OFFICER
# =============================================================================

def require_officer(

    current_user: User = Depends(
        get_current_user
    ),
):

    if (
        current_user.role
        != "OFFICER"
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Officer access required."
            ),
        )


    return current_user