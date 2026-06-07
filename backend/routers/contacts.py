from fastapi import APIRouter, Depends, HTTPException
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
    contacto = models.Contacto(**data.dict())
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    return contacto


@router.get("/", response_model=list[schemas.ContactoResponse], summary="Listar contactos (admin)")
def listar_contactos(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    q = db.query(models.Contacto)
    if estado:
        q = q.filter(models.Contacto.estado == estado)
    return q.order_by(models.Contacto.created_at.desc()).all()


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
