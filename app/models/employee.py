from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    employee_id = Column(String(50), nullable=False)
    code = Column(String(50), nullable=True)
    full_name = Column(String(255), nullable=False)
    birth_year = Column(Integer, nullable=True)
    status = Column(String(100), nullable=True)
    raw_title = Column(String(255), nullable=True)
    role_track = Column(String(50), nullable=True)
    title = Column(String(255), nullable=True)
    expertise_group = Column(String(100), nullable=True)
    expertise_segment = Column(String(50), nullable=True)
    training_source = Column(String(255), nullable=True)

    users = relationship("User", back_populates="employee")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="employee")
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    display_name = Column(String(255), nullable=True)
    token = Column(String(255), unique=True, nullable=True)

    employee = relationship("Employee", back_populates="users")


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id = Column(Integer, primary_key=True)
    reference = Column(String(100), unique=True, nullable=False)
    amount_vnd = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for anonymous payments
    consumed_at = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=False)
    paid_at = Column(String(50), nullable=True)
    source = Column(String(100), nullable=True)
    original_filename = Column(String(255), nullable=True)
