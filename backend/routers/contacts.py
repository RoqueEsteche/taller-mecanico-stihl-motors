from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
import schemas
from auth import require_admin

router = APIRouter(prefix="/api/contactos", tags=["Contactos / Leads"])

ESTADOS_VALIDOS = ["nuevo", "en_proceso", "resuelto", "cerrado"]


@router.post("/", response_model=schemas.ContactoResponse, status_code=201, summary="Registrar contacto desde formulario web")
def crear_contacto(data: schemas.ContactoCreate, db: Session = Depends(get_db)):
    payload = data.model_dump(exclude_unset=True)
    payload["estado"] = payload.get("estado") or "nuevo"
    contacto = models.Contacto(**payload)
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    return contacto


@router.get("/", response_model=list[schemas.ContactoResponse], summary="Listar contactos (admin)")
def listar_contactos(
    estado: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    query = db.query(models.Contacto)
    if estado:
        query = query.filter(models.Contacto.estado == estado)
    if q:
        key = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Contacto.nombre).like(key),
                func.lower(models.Contacto.apellido).like(key),
                func.lower(models.Contacto.email).like(key),
                func.lower(models.Contacto.telefono).like(key),
                func.lower(models.Contacto.tipo_maquina).like(key),
                func.lower(models.Contacto.descripcion).like(key),
            )
        )
    return query.order_by(models.Contacto.created_at.desc()).all()


@router.patch("/{contacto_id}/estado", response_model=schemas.ContactoResponse, summary="Actualizar estado de contacto (admin)")
def actualizar_estado(
    contacto_id: int,
    data: schemas.ContactoUpdateEstado,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    if data.estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {ESTADOS_VALIDOS}")

    contacto = db.query(models.Contacto).filter(models.Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    contacto.estado = data.estado
    db.commit()
    db.refresh(contacto)
    return contacto


@router.put("/{contacto_id}", response_model=schemas.ContactoResponse, summary="Editar contacto (admin)")
def editar_contacto(
    contacto_id: int,
    data: schemas.ContactoCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    contacto = db.query(models.Contacto).filter(models.Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(contacto, k, v)
    db.commit()
    db.refresh(contacto)
    return contacto


@router.delete("/{contacto_id}", summary="Eliminar contacto (admin)")
def eliminar_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    contacto = db.query(models.Contacto).filter(models.Contacto.id == contacto_id).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    db.delete(contacto)
    db.commit()
    return {"detail": "Contacto eliminado"}
