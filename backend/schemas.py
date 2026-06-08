from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ── Usuarios ──────────────────────────────────────────────────────────────────
class UsuarioBase(BaseModel):
    nombre:   str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email:    EmailStr


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8)
    rol: Optional[str] = "cliente"


class UsuarioUpdate(BaseModel):
    nombre:   str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email:    EmailStr
    rol:      str
    password: Optional[str] = None  # si se provee, actualiza contraseña


class UsuarioResponse(UsuarioBase):
    id:        int
    rol:       str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type:   str
    usuario:      UsuarioResponse


# ── Contactos ─────────────────────────────────────────────────────────────────
class ContactoCreate(BaseModel):
    nombre:       str = Field(min_length=2, max_length=100)
    apellido:     str = Field(min_length=2, max_length=100)
    email:        EmailStr
    telefono:     str = Field(min_length=6, max_length=20)
    tipo_maquina: str = Field(min_length=2)
    descripcion:  str = Field(min_length=10)
    estado:       Optional[str] = None


class ContactoResponse(ContactoCreate):
    id:        int
    estado:    str
    created_at: datetime

    class Config:
        from_attributes = True


class ContactoUpdateEstado(BaseModel):
    estado: str


# ── Servicios ─────────────────────────────────────────────────────────────────
class ServicioCreate(BaseModel):
    nombre:          str
    categoria:       str
    descripcion:     str
    precio_base:     float
    imagen_path:     str
    disponible:      Optional[bool] = True
    tiempo_estimado: Optional[str]  = None


class ServicioResponse(ServicioCreate):
    id:        int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────
class PageViewCreate(BaseModel):
    pagina: str


class StatsResponse(BaseModel):
    # Contactos / leads
    total_contactos:      int
    contactos_nuevo:      int
    contactos_en_proceso: int
    contactos_resuelto:   int
    contactos_cerrado:    int
    # Catálogo
    total_servicios:      int
    total_usuarios:       int
    total_visitas:        int
    # Agenda
    total_turnos:         int
    turnos_hoy:           int
    turnos_pendientes:    int
    # Órdenes de trabajo
    total_ordenes:        int
    ordenes_activas:      int
    ordenes_listas:       int
    ordenes_hoy:          int
    # Taller
    mecanicos_activos:    int
    repuestos_bajo_stock: int


# ── Turnos / Agenda ───────────────────────────────────────────────────────────
class TurnoCreate(BaseModel):
    cliente_nombre:   str = Field(min_length=2, max_length=200)
    cliente_email:    Optional[str] = None
    cliente_telefono: Optional[str] = None
    vehiculo:         str = Field(min_length=2, max_length=200)
    servicio:         str = Field(min_length=2, max_length=200)
    fecha:            str = Field(min_length=10, max_length=10)
    hora:             str = Field(min_length=5,  max_length=5)
    mecanico:         Optional[str] = None
    notas:            Optional[str] = None


class TurnoResponse(TurnoCreate):
    id:        int
    estado:    str
    created_at: datetime

    class Config:
        from_attributes = True


class TurnoUpdateEstado(BaseModel):
    estado: str


# ── Mecánicos ─────────────────────────────────────────────────────────────────
class MecanicoCreate(BaseModel):
    nombre:       str = Field(min_length=2, max_length=100)
    apellido:     str = Field(min_length=2, max_length=100)
    telefono:     Optional[str] = None
    email:        Optional[str] = None
    especialidad: Optional[str] = None
    activo:       Optional[bool] = True


class MecanicoResponse(MecanicoCreate):
    id:        int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Órdenes de Trabajo ────────────────────────────────────────────────────────
class OrdenTrabajoCreate(BaseModel):
    cliente_nombre:       str = Field(min_length=2, max_length=200)
    cliente_email:        Optional[str] = None
    cliente_telefono:     Optional[str] = None
    vehiculo:             str = Field(min_length=2, max_length=300)
    descripcion_problema: str = Field(min_length=5)
    diagnostico:          Optional[str] = None
    trabajo_realizado:    Optional[str] = None
    mecanico_id:          Optional[int] = None
    mecanico_nombre:      Optional[str] = None
    estado:               Optional[str] = "recibido"
    prioridad:            Optional[str] = "normal"
    costo_mano_obra:      Optional[float] = 0.0
    costo_repuestos:      Optional[float] = 0.0
    costo_total:          Optional[float] = 0.0
    fecha_estimada:       Optional[str] = None
    notas_internas:       Optional[str] = None


class OrdenTrabajoResponse(OrdenTrabajoCreate):
    id:           int
    numero:       Optional[str]
    fecha_entrega: Optional[datetime]
    created_at:   datetime

    class Config:
        from_attributes = True


class OrdenUpdateEstado(BaseModel):
    estado: str


# ── Repuestos / Inventario ────────────────────────────────────────────────────
class RepuestoCreate(BaseModel):
    codigo:       str = Field(min_length=1, max_length=50)
    nombre:       str = Field(min_length=2, max_length=200)
    descripcion:  Optional[str] = None
    categoria:    Optional[str] = None
    stock:        Optional[int] = 0
    stock_minimo: Optional[int] = 5
    precio_costo: Optional[float] = 0.0
    precio_venta: Optional[float] = 0.0
    proveedor:    Optional[str] = None
    ubicacion:    Optional[str] = None
    activo:       Optional[bool] = True


class RepuestoResponse(RepuestoCreate):
    id:        int
    created_at: datetime

    class Config:
        from_attributes = True


class AjusteStock(BaseModel):
    delta: int  # positivo = entrada, negativo = salida
