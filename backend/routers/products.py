from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
import schemas
from auth import require_admin

router = APIRouter(prefix="/api/servicios", tags=["Servicios / Catálogo"])


@router.get("/", response_model=list[schemas.ServicioResponse], summary="Listar servicios del catálogo")
def listar_servicios(categoria: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Servicio).filter(models.Servicio.disponible == True)
    if categoria:
        q = q.filter(models.Servicio.categoria == categoria)
    return q.order_by(models.Servicio.nombre).all()


@router.get("/{servicio_id}", response_model=schemas.ServicioResponse, summary="Obtener servicio por ID")
def obtener_servicio(servicio_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return s


@router.post("/", response_model=schemas.ServicioResponse, status_code=201, summary="Crear servicio (admin)")
def crear_servicio(
    data: schemas.ServicioCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    s = models.Servicio(**data.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{servicio_id}", response_model=schemas.ServicioResponse, summary="Actualizar servicio (admin)")
def actualizar_servicio(
    servicio_id: int,
    data: schemas.ServicioCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    s = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for k, v in data.dict().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{servicio_id}", summary="Eliminar servicio (admin)")
def eliminar_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_admin),
):
    s = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(s)
    db.commit()
    return {"detail": "Servicio eliminado"}
