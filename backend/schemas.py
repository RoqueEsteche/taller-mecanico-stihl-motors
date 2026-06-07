from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ── Usuarios ──────────────────────────────────────────────────────────────────
class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email: EmailStr


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8)
    rol: Optional[str] = "cliente"


class UsuarioResponse(UsuarioBase):
    id: int
    rol: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


# ── Contactos ─────────────────────────────────────────────────────────────────
class ContactoCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefono: str = Field(min_length=6, max_length=20)
    tipo_maquina: str = Field(min_length=2)
    descripcion: str = Field(min_length=10)


class ContactoResponse(ContactoCreate):
    id: int
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContactoUpdateEstado(BaseModel):
    estado: str


# ── Servicios ─────────────────────────────────────────────────────────────────
class ServicioCreate(BaseModel):
    nombre: str
    categoria: str
    descripcion: str
    precio_base: float
    imagen_path: str
    disponible: Optional[bool] = True
    tiempo_estimado: Optional[str] = None


class ServicioResponse(ServicioCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────
class PageViewCreate(BaseModel):
    pagina: str


class StatsResponse(BaseModel):
    total_contactos: int
    contactos_nuevo: int
    contactos_en_proceso: int
    contactos_resuelto: int
    contactos_cerrado: int
    total_servicios: int
    total_usuarios: int
    total_visitas: int
