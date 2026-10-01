# Pesca & Outdoor — Starter Full-Stack

Base ejecutable para una plataforma de pesca deportiva, caza responsable y actividades outdoor.

## Stack

- API: FastAPI + SQLAlchemy 2 + GeoAlchemy2
- Datos: PostgreSQL 18 + PostGIS 3.6 + JSONB
- Cliente universal: React Native + Expo + TypeScript (Android/iOS/Web)
- Migraciones: Alembic
- Seguridad: JWT access/refresh + Argon2 (`pwdlib`)
- Infraestructura local: Docker Compose

## Estructura

```text
pesca-outdoor/
├─ docker-compose.yml
├─ .env.example
├─ backend/
│  ├─ Dockerfile
│  ├─ requirements.txt
│  ├─ alembic.ini
│  ├─ alembic/
│  │  ├─ env.py
│  │  └─ versions/0001_initial.py
│  ├─ scripts/
│  │  ├─ start-dev.sh
│  │  └─ start-prod.sh
│  └─ app/
│     ├─ main.py
│     ├─ seed.py
│     ├─ core/           # configuración + JWT/hash
│     ├─ db/             # Base y sesión SQLAlchemy
│     ├─ models/         # ORM relacional/PostGIS/JSONB
│     ├─ schemas/        # DTOs Pydantic
│     ├─ services/       # privacidad geográfica + clima/solunar
│     └─ api/v1/         # endpoints REST
└─ mobile/
   ├─ App.tsx
   ├─ package.json
   ├─ app.json
   └─ src/
      ├─ components/
      ├─ screens/
      ├─ services/
      └─ types/
```

## 1. Puesta en marcha del backend

### Requisitos

- Docker Desktop con Docker Compose v2
- Git opcional

### Primera ejecución

Desde la raíz del proyecto:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

**Antes de producción**, cambia `POSTGRES_PASSWORD` y `JWT_SECRET` en `.env`.

Levanta PostgreSQL/PostGIS + API:

```bash
docker compose up --build
```

El contenedor API ejecuta automáticamente:

1. `alembic upgrade head`
2. seed de productos demo
3. FastAPI/Uvicorn con hot reload

Servicios:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
- Health: http://localhost:8000/health
- PostgreSQL: localhost:5432

### Crear el primer usuario

Puedes usar Swagger (`POST /api/v1/auth/register`) o terminal:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"demo@example.com",
    "username":"demo",
    "password":"UnaClaveSegura123!",
    "display_name":"Usuario Demo"
  }'
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo&password=UnaClaveSegura123!"
```

## 2. Aplicación Android/iOS/Web

Expo SDK 57 requiere Node.js 22.13.x o superior compatible con su matriz actual.

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

O directamente:

```bash
npm run web
npm run android
npm run ios
```

### URL de la API según plataforma

Web / iOS Simulator:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Android Emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

Teléfono físico conectado a la misma red Wi-Fi:

```env
EXPO_PUBLIC_API_URL=http://IP_LOCAL_DE_TU_PC:8000/api/v1
```

Ejemplo: `http://192.168.1.50:8000/api/v1`.

## 3. Modelos incluidos

### Identidad

- `users`
- `profiles`

### Muro de trofeos

- `trophies`
- `trophy_media`
- `trophy_equipment`

La coordenada exacta se almacena como `GEOGRAPHY(Point,4326)` y no se expone en `TrophyRead`. La ubicación pública puede ser exacta, desplazada 1 km/5 km o completamente omitida según `geo_privacy`.

### El Armario

- `wardrobe_items`
- relación opcional con `catalog_products`
- `specifications JSONB`

### Catálogo + evidencia real

- `catalog_products`
- `product_media`
- `product_evidence`
- `product_reviews`

`specifications` y `recommendation_context` son JSONB para admitir características distintas entre cañas, carretes, señuelos, ropa, embarcaciones y otros productos sin alterar el esquema cada vez.

### Comparador/precios/ofertas

- `merchants`
- `product_offers`
- `price_history`
- `deal_reports`
- `deal_validations`

La validación comunitaria usa estados `available`, `expired` y `wrong_price` con una sola validación por usuario/oferta.

## 4. Endpoints principales

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

GET    /api/v1/trophies
POST   /api/v1/trophies
GET    /api/v1/trophies/{id}
GET    /api/v1/trophies/{id}/private-location
DELETE /api/v1/trophies/{id}

GET    /api/v1/wardrobe
POST   /api/v1/wardrobe
DELETE /api/v1/wardrobe/{id}

GET    /api/v1/catalog/products
GET    /api/v1/catalog/products/{id}
GET    /api/v1/catalog/products/{id}/evidence
POST   /api/v1/catalog/products/{id}/evidence
GET    /api/v1/catalog/products/{id}/reviews
POST   /api/v1/catalog/products/{id}/reviews
POST   /api/v1/catalog/compare
GET    /api/v1/catalog/products/{id}/offers
GET    /api/v1/catalog/offers/{offer_id}/history

GET    /api/v1/deals
POST   /api/v1/deals
POST   /api/v1/deals/{id}/validate

GET    /api/v1/environment/weather/current
GET    /api/v1/environment/solunar
```

## 5. Privacidad geográfica

`app/services/location_privacy.py` aplica la privacidad en backend:

- `exact`: el punto público coincide con el real.
- `approx_1km`: se genera un punto aleatorio dentro de un radio aproximado de 1 km.
- `approx_5km`: igual, hasta unos 5 km.
- `region_only`: no se publica punto.
- `private`: no se publica punto.

La posición exacta solo se recupera mediante `/trophies/{id}/private-location` y únicamente si el JWT pertenece al propietario.

Para producción de alto riesgo, una mejora posterior es cifrar las coordenadas exactas a nivel de aplicación/KMS además de los controles de autorización.

## 6. Clima y solunar

`/environment/weather/current` usa Open-Meteo mediante HTTP sin API key en este starter. El proveedor está encapsulado en `EnvironmentService`, para poder cambiarlo por un proveedor comercial/marino sin modificar controladores.

El endpoint solunar calcula fase lunar e índice heurístico. **No se presenta como probabilidad garantizada de captura.** A futuro, reemplaza/combina el índice con datos históricos reales por especie, zona, presión, viento y temporada.

## 7. Migraciones después del esquema inicial

El starter incluye una migración inicial que crea PostGIS y las tablas actuales desde metadata. A partir de aquí, usa migraciones explícitas autogeneradas:

```bash
docker compose exec api alembic revision --autogenerate -m "add notifications"
docker compose exec api alembic upgrade head
```

Revisa siempre el archivo autogenerado antes de ejecutarlo en producción.

## 8. Comandos útiles

Parar servicios:

```bash
docker compose down
```

Parar y borrar la base local:

```bash
docker compose down -v
```

Reconstruir API:

```bash
docker compose build api
docker compose up api
```

Logs:

```bash
docker compose logs -f api
docker compose logs -f db
```

Entrar a PostgreSQL:

```bash
docker compose exec db psql -U pesca -d pesca_outdoor
```

Comprobar PostGIS:

```sql
SELECT PostGIS_Full_Version();
```

## 9. Producción: cambios necesarios antes de publicar

Este repositorio es un **starter ejecutable con arquitectura de producción**, no una infraestructura cloud cerrada. Antes del lanzamiento público:

- secretos en Secret Manager/Vault; nunca `.env` versionado;
- PostgreSQL administrado con backups y PITR;
- S3/Cloud Storage para fotos/videos y CDN;
- eliminación de EXIF GPS al procesar fotografías;
- refresh tokens persistidos/revocables y rotación por dispositivo;
- rate limiting y protección anti abuso;
- moderación y reportes;
- logs estructurados + Sentry/OpenTelemetry;
- pruebas automatizadas y pipeline CI/CD;
- HTTPS obligatorio;
- políticas de retención y privacidad;
- tiles/mapas offline con proveedor licenciado;
- fuentes oficiales para regulaciones/temporadas por jurisdicción.

Para la sección de caza, el catálogo/marketplace debería centrarse en equipo outdoor no regulado salvo que una integración específica cumpla la normativa y las políticas aplicables al comercio de artículos regulados.
