from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import engine, Base, get_db, SessionLocal
from routers import users, contacts, products
import models
import schemas

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-poblar la BD si está vacía (necesario en Render: filesystem efímero)."""
    db = SessionLocal()
    try:
        if db.query(models.Usuario).count() == 0:
            import seed
            seed.run(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="PowerFix API — Taller Mecánico Especializado",
    description=(
        "API REST del sistema de gestión para PowerFix. "
        "Gestiona usuarios, solicitudes de servicio, catálogo y analítica."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(products.router)


# ── Analytics ─────────────────────────────────────────────────────────────────
@app.post("/api/analytics/pageview", tags=["Analytics"], summary="Registrar visita de página")
def registrar_visita(data: schemas.PageViewCreate, db: Session = Depends(get_db)):
    pv = models.PageView(pagina=data.pagina)
    db.add(pv)
    db.commit()
    return {"ok": True}


# ── Stats generales ───────────────────────────────────────────────────────────
@app.get("/api/stats", response_model=schemas.StatsResponse, tags=["Analytics"], summary="Estadísticas generales (admin)")
def get_stats(db: Session = Depends(get_db)):
    def count_contactos(estado=None):
        q = db.query(func.count(models.Contacto.id))
        if estado:
            q = q.filter(models.Contacto.estado == estado)
        return q.scalar() or 0

    return {
        "total_contactos": count_contactos(),
        "contactos_nuevo": count_contactos("nuevo"),
        "contactos_en_proceso": count_contactos("en_proceso"),
        "contactos_resuelto": count_contactos("resuelto"),
        "contactos_cerrado": count_contactos("cerrado"),
        "total_servicios": db.query(func.count(models.Servicio.id)).scalar() or 0,
        "total_usuarios": db.query(func.count(models.Usuario.id)).scalar() or 0,
        "total_visitas": db.query(func.count(models.PageView.id)).scalar() or 0,
    }


# ── Datos para gráficos ───────────────────────────────────────────────────────
@app.get("/api/stats/charts", tags=["Analytics"], summary="Datos para gráficos (admin)")
def get_chart_data(db: Session = Depends(get_db)):
    # Contactos por tipo de máquina
    maquinas_raw = (
        db.query(models.Contacto.tipo_maquina, func.count(models.Contacto.id))
        .group_by(models.Contacto.tipo_maquina)
        .all()
    )
    maquinas = {"labels": [r[0] for r in maquinas_raw], "data": [r[1] for r in maquinas_raw]}

    # Estados de contactos
    estados_raw = (
        db.query(models.Contacto.estado, func.count(models.Contacto.id))
        .group_by(models.Contacto.estado)
        .all()
    )
    estados = {"labels": [r[0] for r in estados_raw], "data": [r[1] for r in estados_raw]}

    # Visitas por página (últimos 7 días)
    hace_7_dias = datetime.utcnow() - timedelta(days=7)
    visitas_raw = (
        db.query(
            func.strftime("%Y-%m-%d", models.PageView.created_at).label("dia"),
            func.count(models.PageView.id),
        )
        .filter(models.PageView.created_at >= hace_7_dias)
        .group_by("dia")
        .order_by("dia")
        .all()
    )
    visitas = {"labels": [r[0] for r in visitas_raw], "data": [r[1] for r in visitas_raw]}

    return {"maquinas": maquinas, "estados": estados, "visitas": visitas}


@app.get("/", tags=["Root"])
def root():
    return {
        "mensaje": "PowerFix API activa",
        "docs": "/docs",
        "version": "1.0.0",
    }
