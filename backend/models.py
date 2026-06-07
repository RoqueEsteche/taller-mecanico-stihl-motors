from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.sql import func
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), default="cliente")  # admin | empleado | cliente
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Contacto(Base):
    __tablename__ = "contactos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=False)
    tipo_maquina = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado = Column(String(20), default="nuevo")  # nuevo | en_proceso | resuelto | cerrado
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Servicio(Base):
    __tablename__ = "servicios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    precio_base = Column(Float, nullable=False)
    imagen_path = Column(String(300), nullable=False)
    disponible = Column(Boolean, default=True)
    tiempo_estimado = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PageView(Base):
    __tablename__ = "page_views"

    id = Column(Integer, primary_key=True, index=True)
    pagina = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
