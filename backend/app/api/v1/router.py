from fastapi import APIRouter

from app.api.v1.endpoints import auth, catalog, credentials, environment, offers, trophies, wardrobe

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(credentials.router)
api_router.include_router(trophies.router)
api_router.include_router(wardrobe.router)
api_router.include_router(catalog.router)
api_router.include_router(offers.router)
api_router.include_router(environment.router)
