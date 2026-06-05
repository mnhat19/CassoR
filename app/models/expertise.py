from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Expertise(Base):
    __tablename__ = "expertises"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    group_name = Column(String(100), nullable=False)
    segment = Column(String(50), nullable=False)
    flag = Column(String(10), nullable=False)
    enable = Column(Boolean, nullable=False, default=True)
    ceiling_prof = Column(String(10), nullable=True)

    titles = relationship("Title", back_populates="expertise")


class Title(Base):
    __tablename__ = "titles"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    vietnamese = Column(String(255), nullable=True)
    expertise_code = Column(String(10), ForeignKey("expertises.code"), nullable=True)
    expertise_name = Column(String(255), nullable=True)
    expertise_group = Column(String(100), nullable=True)
    expertise_segment = Column(String(50), nullable=True)
    track = Column(String(50), nullable=False)
    level = Column(Integer, nullable=False)
    desc = Column(String(1000), nullable=True)
    general_requirement = Column(String(1000), nullable=True)
    exp_requirement = Column(String(1000), nullable=True)

    expertise = relationship("Expertise", back_populates="titles")
