from datetime import date, datetime, timedelta, timezone
import asyncio
import math
import time
import unicodedata

import httpx


class EnvironmentService:
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
    REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse"
    SEARCH_GEOCODE_URL = "https://nominatim.openstreetmap.org/search"

    _nominatim_lock = asyncio.Lock()
    _last_nominatim_request = 0.0
    _reverse_cache: dict[tuple[float, float], dict] = {}
    _search_cache: dict[str, list[dict]] = {}

    async def current_weather(
        self,
        latitude: float,
        longitude: float,
        day: date | None = None,
    ) -> dict:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,apparent_temperature,relative_humidity_2m,"
                "precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,"
                "wind_gusts_10m"
            ),
            "daily": (
                "weather_code,temperature_2m_max,temperature_2m_min,"
                "precipitation_sum,precipitation_probability_max,"
                "wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset"
            ),
            "timezone": "auto",
            "forecast_days": 14,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self.WEATHER_URL, params=params)
            response.raise_for_status()
            payload = response.json()

        target_day = day or date.today()
        payload["selected_day"] = self._selected_daily_weather(
            payload.get("daily") or {},
            target_day,
        )
        payload["selected_day_requested"] = target_day.isoformat()
        return payload

    @staticmethod
    def _selected_daily_weather(daily: dict, day: date) -> dict | None:
        dates = daily.get("time") or []
        target = day.isoformat()
        try:
            index = dates.index(target)
        except ValueError:
            return None

        def item(key: str):
            values = daily.get(key) or []
            return values[index] if index < len(values) else None

        return {
            "date": target,
            "weather_code": item("weather_code"),
            "temperature_2m_max": item("temperature_2m_max"),
            "temperature_2m_min": item("temperature_2m_min"),
            "precipitation_sum": item("precipitation_sum"),
            "precipitation_probability_max": item("precipitation_probability_max"),
            "wind_speed_10m_max": item("wind_speed_10m_max"),
            "wind_gusts_10m_max": item("wind_gusts_10m_max"),
            "sunrise": item("sunrise"),
            "sunset": item("sunset"),
        }

    async def _nominatim_get(self, url: str, params: dict) -> dict | list:
        headers = {
            "User-Agent": "PescaOutdoor/0.2 (development)",
        }

        async with self._nominatim_lock:
            elapsed = time.monotonic() - self._last_nominatim_request
            if elapsed < 1.05:
                await asyncio.sleep(1.05 - elapsed)

            async with httpx.AsyncClient(
                timeout=10.0,
                headers=headers,
            ) as client:
                response = await client.get(url, params=params)
                self._last_nominatim_request = time.monotonic()
                response.raise_for_status()
                return response.json()

    async def reverse_geocode(self, latitude: float, longitude: float) -> dict:
        """
        Reverse geocoding for the MVP.

        We deliberately return only an approximate locality/region and never
        expose the exact coordinates in the location label used by the UI.
        """
        cache_key = (round(latitude, 3), round(longitude, 3))
        cached = self._reverse_cache.get(cache_key)
        if cached:
            return cached

        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "jsonv2",
            "addressdetails": 1,
            "zoom": 10,
            "accept-language": "es",
        }

        try:
            payload = await self._nominatim_get(
                self.REVERSE_GEOCODE_URL,
                params,
            )
        except (httpx.HTTPError, ValueError):
            return {
                "latitude": latitude,
                "longitude": longitude,
                "locality": "Tu zona",
                "region": None,
                "country": "Chile",
                "label": "Tu zona actual",
                "provider": "Ubicación no disponible",
            }

        address = payload.get("address") or {}
        locality = self._extract_locality(address, payload)
        region = self._extract_region(address)
        country = address.get("country") or "Chile"

        label_parts = [locality]
        if region and self._normalize(region) not in self._normalize(locality):
            label_parts.append(region)

        result = {
            "latitude": latitude,
            "longitude": longitude,
            "locality": locality,
            "region": region,
            "country": country,
            "label": ", ".join(label_parts),
            "provider": "© OpenStreetMap contributors",
        }
        self._reverse_cache[cache_key] = result
        return result

    async def search_locations(self, query: str, limit: int = 6) -> list[dict]:
        """Search Chilean localities for manual trip planning."""
        clean_query = " ".join(query.strip().split())
        cache_key = f"{self._normalize(clean_query)}:{limit}"
        cached = self._search_cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "q": clean_query,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": limit,
            "countrycodes": "cl",
            "accept-language": "es",
        }

        try:
            payload = await self._nominatim_get(
                self.SEARCH_GEOCODE_URL,
                params,
            )
        except (httpx.HTTPError, ValueError):
            return []

        results: list[dict] = []
        seen: set[tuple[str, str]] = set()

        for item in payload if isinstance(payload, list) else []:
            address = item.get("address") or {}
            locality = self._extract_locality(address, item)
            region = self._extract_region(address)
            country = address.get("country") or "Chile"

            try:
                latitude = float(item.get("lat"))
                longitude = float(item.get("lon"))
            except (TypeError, ValueError):
                continue

            label_parts = [locality]
            if region and self._normalize(region) not in self._normalize(locality):
                label_parts.append(region)
            label = ", ".join(label_parts)

            dedupe_key = (self._normalize(label), f"{latitude:.3f},{longitude:.3f}")
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            results.append(
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "locality": locality,
                    "region": region,
                    "country": country,
                    "label": label,
                    "provider": "© OpenStreetMap contributors",
                }
            )

        self._search_cache[cache_key] = results
        return results

    @staticmethod
    def _extract_locality(address: dict, payload: dict) -> str:
        return (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
            or address.get("city_district")
            or address.get("suburb")
            or payload.get("name")
            or "Zona seleccionada"
        )

    @staticmethod
    def _extract_region(address: dict) -> str | None:
        return (
            address.get("state")
            or address.get("region")
            or address.get("state_district")
        )

    async def outdoor_context(
        self,
        latitude: float,
        longitude: float,
        day: date | None = None,
    ) -> dict:
        current_day = day or date.today()
        location = await self.reverse_geocode(latitude, longitude)

        return {
            "location": location,
            "seasons": self.season_summary(
                current_day,
                location.get("region"),
            ),
            "checked_at": current_day.isoformat(),
            "notice": (
                "Resumen informativo. Las restricciones pueden variar por "
                "especie, cuenca, área protegida y resolución vigente. "
                "Verifica siempre la fuente oficial antes de realizar la actividad."
            ),
        }

    @staticmethod
    def _normalize(value: str | None) -> str:
        if not value:
            return ""
        normalized = unicodedata.normalize("NFD", value)
        return "".join(
            char for char in normalized
            if unicodedata.category(char) != "Mn"
        ).lower()

    @staticmethod
    def _second_friday_of_november(year: int) -> date:
        current = date(year, 11, 1)
        while current.weekday() != 4:
            current += timedelta(days=1)
        return current + timedelta(days=7)

    @staticmethod
    def _first_sunday_of_may(year: int) -> date:
        current = date(year, 5, 1)
        while current.weekday() != 6:
            current += timedelta(days=1)
        return current

    @staticmethod
    def _format_date(day: date) -> str:
        months = [
            "ene", "feb", "mar", "abr", "may", "jun",
            "jul", "ago", "sep", "oct", "nov", "dic",
        ]
        return f"{day.day} {months[day.month - 1]} {day.year}"

    def _general_salmonid_window(self, day: date) -> tuple[date, date, bool]:
        if day.month >= 11:
            start = self._second_friday_of_november(day.year)
            end = self._first_sunday_of_may(day.year + 1)
        else:
            previous_start = self._second_friday_of_november(day.year - 1)
            current_end = self._first_sunday_of_may(day.year)

            if previous_start <= day <= current_end:
                return previous_start, current_end, True

            start = self._second_friday_of_november(day.year)
            end = self._first_sunday_of_may(day.year + 1)

        return start, end, start <= day <= end

    def season_summary(self, day: date, region: str | None) -> list[dict]:
        region_key = self._normalize(region)
        is_araucania = "araucania" in region_key

        salmon_start, salmon_end, salmon_open = self._general_salmonid_window(day)

        seasons: list[dict] = []

        if is_araucania:
            chinook_start = date(2026, 9, 15)
            chinook_end = date(2027, 3, 31)
            chinook_open = chinook_start <= day <= chinook_end

            seasons.append(
                {
                    "category": "pesca",
                    "species": "Salmón Chinook",
                    "scientific_name": "Oncorhynchus tshawytscha",
                    "status": "open" if chinook_open else "closed",
                    "status_label": (
                        "Abierta con condiciones"
                        if chinook_open
                        else "Fuera de temporada"
                    ),
                    "period": "15 sep 2026 – 31 mar 2027",
                    "summary": (
                        "Solo en cuerpos y cursos de agua de las cuencas "
                        "de los ríos Toltén e Imperial. Límite: 1 ejemplar "
                        "por pescador por jornada, sin límite de peso."
                    ),
                    "authority": "SERNAPESCA",
                    "source_title": (
                        "Inicio temporada Chinook 2026-2027 en La Araucanía"
                    ),
                    "source_url": (
                        "https://www.sernapesca.cl/noticias/"
                        "araucania-sernapesca-informa-el-inicio-de-temporada-"
                        "de-pesca-recreativa-del-chinook-en-los-rios-tolten-e-imperial/"
                    ),
                }
            )

        seasons.append(
            {
                "category": "pesca",
                "species": "Salmonídeos",
                "scientific_name": None,
                "status": "open" if salmon_open else "closed",
                "status_label": (
                    "Temporada abierta"
                    if salmon_open
                    else "Temporada cerrada"
                ),
                "period": (
                    f"{self._format_date(salmon_start)} – "
                    f"{self._format_date(salmon_end)}"
                ),
                "summary": (
                    "Temporada general en aguas continentales: desde el "
                    "segundo viernes de noviembre hasta el primer domingo "
                    "de mayo del año siguiente. Existen excepciones locales."
                ),
                "authority": "SERNAPESCA",
                "source_title": "Temporadas de Pesca Recreativa en Chile",
                "source_url": (
                    "https://www.sernapesca.cl/manuales_y_publicaciones/"
                    "temporadas-de-pesca-recreativa-en-chile/"
                ),
            }
        )

        native_veda_end = date(2026, 10, 5)
        native_protected = day <= native_veda_end

        seasons.append(
            {
                "category": "pesca",
                "species": "Trucha negra",
                "scientific_name": "Percichthys melanops",
                "status": "protected" if native_protected else "review",
                "status_label": (
                    "Veda extractiva vigente"
                    if native_protected
                    else "Revisar normativa vigente"
                ),
                "period": "Veda informada hasta 5 oct 2026",
                "summary": (
                    "Especie nativa incluida en la veda extractiva de "
                    "especies ícticas protegidas. Tras el 5 oct 2026, "
                    "la app debe verificar la norma oficial actualizada."
                ),
                "authority": "SERNAPESCA",
                "source_title": "Especies ícticas nativas protegidas",
                "source_url": (
                    "https://www.sernapesca.cl/app/uploads/2023/11/"
                    "especies_icticas_nativas_protegidas_aguas_terrestres_"
                    "decreto_878-2011.pdf"
                ),
            }
        )

        if is_araucania:
            seasons.extend(
                [
                    {
                        "category": "caza",
                        "species": "Conejo / liebre",
                        "scientific_name": None,
                        "status": "regulated",
                        "status_label": "Regulación especial",
                        "period": "Todo el año, con restricciones de método",
                        "summary": (
                            "SAG las considera especies dañinas cazables "
                            "todo el año; sin embargo, en La Araucanía está "
                            "prohibida su caza diurna con armas de fuego o "
                            "aire comprimido entre el 1 sep y el 31 mar."
                        ),
                        "authority": "SAG",
                        "source_title": "Permisos de caza y captura de fauna silvestre",
                        "source_url": (
                            "https://www.sag.gob.cl/ambitos-de-accion/"
                            "permisos-de-caza-y-captura-de-fauna-silvestre"
                        ),
                    },
                    {
                        "category": "caza",
                        "species": "Patos autorizados",
                        "scientific_name": None,
                        "status": (
                            "regulated"
                            if date(day.year, 4, 1) <= day <= date(day.year, 7, 31)
                            else "closed"
                        ),
                        "status_label": (
                            "Revisar especie y cuota"
                            if date(day.year, 4, 1) <= day <= date(day.year, 7, 31)
                            else "Temporada general cerrada"
                        ),
                        "period": "Varias especies: 1 abr – 31 jul",
                        "summary": (
                            "En Zona Sur las fechas y cuotas dependen de la "
                            "especie de pato. No todas las especies están "
                            "autorizadas para caza."
                        ),
                        "authority": "SAG",
                        "source_title": "Especies autorizadas para su caza",
                        "source_url": (
                            "https://www.sag.gob.cl/ambitos-de-accion/"
                            "especies-autorizadas-para-su-caza"
                        ),
                    },
                ]
            )

        return seasons

    @staticmethod
    def moon_phase_fraction(day: date) -> float:
        # Simple astronomical approximation. 0=new moon, 0.5=full moon.
        known_new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
        target = datetime(day.year, day.month, day.day, 12, 0, tzinfo=timezone.utc)
        synodic_month = 29.53058867
        return ((target - known_new_moon).total_seconds() / 86400 / synodic_month) % 1.0

    @staticmethod
    def phase_name(fraction: float) -> str:
        names = [
            "Luna nueva",
            "Creciente",
            "Cuarto creciente",
            "Gibosa creciente",
            "Luna llena",
            "Gibosa menguante",
            "Cuarto menguante",
            "Menguante",
        ]
        return names[int((fraction * 8) + 0.5) % 8]

    def solunar_summary(self, day: date) -> dict:
        fraction = self.moon_phase_fraction(day)
        illumination = (1 - math.cos(2 * math.pi * fraction)) / 2
        # Heuristic activity index, intentionally not presented as capture probability.
        distance_to_major = min(abs(fraction), abs(fraction - 0.5), abs(fraction - 1.0))
        lunar_component = max(0.0, 1.0 - distance_to_major / 0.25)
        score = round(45 + 35 * lunar_component)
        return {
            "date": day.isoformat(),
            "moon_phase_fraction": round(fraction, 4),
            "moon_illumination": round(illumination, 4),
            "phase_name": self.phase_name(fraction),
            "activity_index": max(0, min(100, score)),
            "activity_index_note": "Índice heurístico; no representa probabilidad garantizada de captura.",
        }
