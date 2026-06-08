import smtplib
import os
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# Configuración de email — poner en variables de entorno en Render
GMAIL_USER     = os.environ.get("GMAIL_USER", "power.fix.uninorte@gmail.com")
GMAIL_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
NOTIFY_EMAIL   = "power.fix.uninorte@gmail.com"


def _send_email(data: dict):
    """Envía notificación de nueva consulta. Corre en hilo separado."""
    if not GMAIL_PASSWORD:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔧 Nueva consulta — {data['nombre']} {data['apellido']} | PowerFix"
        msg["From"]    = GMAIL_USER
        msg["To"]      = NOTIFY_EMAIL

        html = f"""
        <html><body style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;background:#f1f5f9;padding:24px;">
          <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <div style="background:linear-gradient(135deg,#E55F0A,#c44f08);padding:28px 32px;">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                🔧 PowerFix — Nueva Consulta Recibida
              </h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
                Un cliente envió una solicitud desde el sitio web
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:12px 0;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;width:140px;">Nombre</td>
                  <td style="padding:12px 0;font-size:15px;font-weight:600;color:#111827;">{data['nombre']} {data['apellido']}</td>
                </tr>
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:12px 0;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;">Email</td>
                  <td style="padding:12px 0;font-size:15px;color:#111827;"><a href="mailto:{data['email']}" style="color:#E55F0A;">{data['email']}</a></td>
                </tr>
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:12px 0;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;">Teléfono</td>
                  <td style="padding:12px 0;font-size:15px;color:#111827;"><a href="tel:{data['telefono']}" style="color:#E55F0A;">{data['telefono']}</a></td>
                </tr>
                <tr>
                  <td style="padding:12px 0;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;">Máquina</td>
                  <td style="padding:12px 0;font-size:15px;font-weight:600;color:#111827;">{data['tipo_maquina']}</td>
                </tr>
              </table>

              <div style="margin-top:24px;">
                <p style="font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Descripción del Problema</p>
                <div style="background:#f9fafb;border-left:4px solid #E55F0A;border-radius:8px;padding:16px;font-size:14px;color:#374151;line-height:1.7;">
                  {data['descripcion']}
                </div>
              </div>

              <div style="margin-top:28px;text-align:center;">
                <a href="https://powerfix-taller.onrender.com/admin.html"
                   style="display:inline-block;background:linear-gradient(135deg,#E55F0A,#c44f08);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
                  Ver en el Panel Admin
                </a>
              </div>
            </div>

            <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                Notificación automática de PowerFix &mdash; Taller Mecánico Especializado
              </p>
            </div>
          </div>
        </body></html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, NOTIFY_EMAIL, msg.as_string())
    except Exception:
        pass  # Email no es crítico — no interrumpe el flujo


def notify_new_contact(contacto):
    """Lanza el envío de email en background."""
    data = {
        "nombre":      contacto.nombre,
        "apellido":    contacto.apellido,
        "email":       contacto.email,
        "telefono":    contacto.telefono or "—",
        "tipo_maquina": contacto.tipo_maquina,
        "descripcion": contacto.descripcion,
    }
    thread = threading.Thread(target=_send_email, args=(data,), daemon=True)
    thread.start()


@router.post("/", response_model=schemas.ContactoResponse, status_code=201, summary="Registrar contacto desde formulario web")
def crear_contacto(data: schemas.ContactoCreate, db: Session = Depends(get_db)):
    payload = data.model_dump(exclude_unset=True)
    payload["estado"] = payload.get("estado") or "nuevo"
    contacto = models.Contacto(**payload)
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    notify_new_contact(contacto)
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
