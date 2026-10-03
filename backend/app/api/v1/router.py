from fastapi import APIRouter

from app.api.v1.endpoints import (
    affiliate,
    auth,
    catalog,
    credentials,
    environment,
    offers,
    profile,
    social,
    spots,
    trophies,
    wardrobe,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(credentials.router)
api_router.include_router(profile.router)
api_router.include_router(trophies.router)
api_router.include_router(social.router)
api_router.include_router(spots.router)
api_router.include_router(wardrobe.router)
api_router.include_router(catalog.router)
api_router.include_router(offers.router)
api_router.include_router(environment.router)

# Recomendados / Afiliados
api_router.include_router(affiliate.router)