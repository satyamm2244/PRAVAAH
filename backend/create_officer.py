import os
import time
import uuid

from database import SessionLocal
from models import User
from auth import hash_password, normalize_email


def create_officer():
    db = SessionLocal()

    try:
        name = os.getenv(
            "OFFICER_NAME",
            "PRAVAAH Officer",
        ).strip()

        email = normalize_email(
            os.getenv(
                "OFFICER_EMAIL",
                "",
            )
        )

        password = os.getenv(
            "OFFICER_PASSWORD",
            "",
        )

        if not email:
            print(
                "OFFICER_EMAIL is missing. "
                "Officer account was not created."
            )
            return

        if not password:
            print(
                "OFFICER_PASSWORD is missing. "
                "Officer account was not created."
            )
            return

        existing_user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

        if existing_user:
            print(
                f"Account already exists for {email}."
            )

            if existing_user.role != "OFFICER":
                print(
                    "Existing account is not an OFFICER."
                )

            return

        officer = User(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash=hash_password(
                password
            ),
            role="OFFICER",
            status="ACTIVE",
            created_at=int(
                time.time() * 1000
            ),
            last_login_at=None,
        )

        db.add(officer)
        db.commit()
        db.refresh(officer)

        print(
            "Officer created successfully."
        )
        print(
            f"Name: {officer.name}"
        )
        print(
            f"Email: {officer.email}"
        )
        print(
            f"Role: {officer.role}"
        )

    except Exception as error:
        db.rollback()

        print(
            "Unable to create officer."
        )
        print(error)

        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_officer()