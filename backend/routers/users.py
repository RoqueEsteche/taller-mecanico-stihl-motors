from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import verify_password, hash_password, create_access_token, get_current_user, require_admin

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


@router.post("/login", response_model=schemas.Token, summary="Iniciar sesión")
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Cuenta inactiva")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "usuario": user}


@router.get("/me", response_model=schemas.UsuarioResponse, summary="Obtener usuario actual")
def get_me(current_user: models.Usuario = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=schemas.UsuarioResponse, status_code=201, summary="Registrar usuario")
def register(data: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    roles_validos = ["admin", "empleado", "cliente"]
    if data.rol not in roles_validos:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Use: {roles_validos}")

    db_user = models.Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/", response_model=list[schemas.UsuarioResponse], summary="Listar usuarios (admin)")
def list_users(db: Session = Depends(get_db), _: models.Usuario = Depends(require_admin)):
    return db.query(models.Usuario).order_by(models.Usuario.created_at.desc()).all()
