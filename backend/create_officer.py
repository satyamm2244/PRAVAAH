import time
import uuid

from database import SessionLocal
from models import User
from auth import hash_password, normalize_email


def create_officer():

    db = SessionLocal()

    try:

        print("\n==============================")
        print("   PRAVAAH OFFICER CREATION")
        print("==============================\n")

        name = input("Officer name: ").strip()
        email = normalize_email(
            input("Officer email: ")
        )
        password = input(
            "Officer password: "
        )

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:

            print(
                "\nAccount already exists "
                "with this email."
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

        print("\nOfficer created successfully.")
        print(f"Name : {officer.name}")
        print(f"Email: {officer.email}")
        print(f"Role : {officer.role}")

    except Exception as error:

        db.rollback()

        print(
            "\nUnable to create officer."
        )
        print(error)

    finally:

        db.close()


if __name__ == "__main__":
    create_officer()