import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { ExploreLocation } from '../services/api';
import type { Spot } from '../types/api';

type MapFilter = 'all' | 'fishing' | 'camping' | 'access';

type LatLon = {
  latitude: number;
  longitude: number;
};

type MapSize = {
  width: number;
  height: number;
};

type Tile = {
  key: string;
  url: string;
  left: number;
  top: number;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 12;
const PAN_STEP = 170;
const MAX_MERCATOR_LATITUDE = 85.05112878;

const FILTERS: Array<{
  value: MapFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: 'all', label: 'Todos', icon: 'apps-outline' },
  { value: 'fishing', label: 'Pesca', icon: 'fish-outline' },
  { value: 'camping', label: 'Camping', icon: 'bonfire-outline' },
  { value: 'access', label: 'Accesos', icon: 'trail-sign-outline' },
];

export function OpenStreetMap({
  spots,
  focusLocation,
}: {
  spots: Spot[];
  focusLocation: ExploreLocation | null;
}) {
  const fallbackCentered = useRef(false);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [size, setSize] = useState<MapSize>({
    width: 0,
    height: 330,
  });
  const [center, setCenter] = useState<LatLon>(() => {
    if (focusLocation) {
      return {
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
      };
    }

    const first = spots.find(hasCoordinates);
    if (first) {
      return {
        latitude: first.latitude as number,
        longitude: first.longitude as number,
      };
    }

    return {
      latitude: -38.7359,
      longitude: -72.5904,
    };
  });

  useEffect(() => {
    if (!focusLocation) return;

    setCenter({
      latitude: focusLocation.latitude,
      longitude: focusLocation.longitude,
    });
    setZoom(DEFAULT_ZOOM);
    setSelectedSpotId(null);
    fallbackCentered.current = true;
  }, [focusLocation?.latitude, focusLocation?.longitude]);

  useEffect(() => {
    if (focusLocation || fallbackCentered.current) return;

    const first = spots.find(hasCoordinates);
    if (!first) return;

    setCenter({
      latitude: first.latitude as number,
      longitude: first.longitude as number,
    });
    fallbackCentered.current = true;
  }, [focusLocation, spots]);

  const visibleSpots = useMemo(
    () =>
      spots.filter(
        (spot) =>
          hasCoordinates(spot) &&
          (filter === 'all' || spot.spot_type === filter),
      ),
    [filter, spots],
  );

  const selectedSpot = useMemo(
    () =>
      spots.find((spot) => spot.id === selectedSpotId) ?? null,
    [selectedSpotId, spots],
  );

  const tiles = useMemo(
    () => calculateTiles(center, zoom, size),
    [center, size, zoom],
  );

  const focusPoint = focusLocation
    ? projectToViewport(
        focusLocation.latitude,
        focusLocation.longitude,
        center,
        zoom,
        size,
      )
    : null;

  function recenter() {
    if (focusLocation) {
      setCenter({
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
      });
      setZoom(DEFAULT_ZOOM);
      return;
    }

    const first = visibleSpots[0] ?? spots.find(hasCoordinates);
    if (!first) return;

    setCenter({
      latitude: first.latitude as number,
      longitude: first.longitude as number,
    });
    setZoom(DEFAULT_ZOOM);
  }

  function pan(dx: number, dy: number) {
    const world = latLonToWorldPixel(
      center.latitude,
      center.longitude,
      zoom,
    );

    const next = worldPixelToLatLon(
      world.x + dx,
      world.y + dy,
      zoom,
    );

    setCenter(next);
  }

  function centerOnSpot(spot: Spot) {
    if (!hasCoordinates(spot)) return;

    setCenter({
      latitude: spot.latitude,
      longitude: spot.longitude,
    });
    setZoom((current) => Math.max(current, 14));
    setSelectedSpotId(spot.id);
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((item) => {
          const active = filter === item.value;
          const count =
            item.value === 'all'
              ? spots.filter(hasCoordinates).length
              : spots.filter(
                  (spot) =>
                    hasCoordinates(spot) &&
                    spot.spot_type === item.value,
                ).length;

          return (
            <Pressable
              key={item.value}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
              ]}
              onPress={() => {
                setFilter(item.value);
                setSelectedSpotId(null);
              }}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? '#10261C' : '#52655B'}
              />
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  active && styles.filterCountActive,
                ]}
              >
                <Text style={styles.filterCountText}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={styles.map}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setSize({ width, height });
          }
        }}
      >
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url }}
            style={[
              styles.tile,
              {
                left: tile.left,
                top: tile.top,
              },
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ))}

        <View style={styles.mapShade} pointerEvents="none" />

        {focusPoint && isVisiblePoint(focusPoint, size, 36) ? (
          <View
            pointerEvents="none"
            style={[
              styles.focusMarker,
              {
                left: focusPoint.x - 17,
                top: focusPoint.y - 17,
              },
            ]}
          >
            <Ionicons name="compass" size={18} color="#FFFFFF" />
          </View>
        ) : null}

        {visibleSpots.map((spot) => {
          const point = projectToViewport(
            spot.latitude as number,
            spot.longitude as number,
            center,
            zoom,
            size,
          );

          if (!isVisiblePoint(point, size, 48)) return null;

          const selected = selectedSpotId === spot.id;

          return (
            <Pressable
              key={spot.id}
              accessibilityRole="button"
              accessibilityLabel={`Spot ${spot.name}`}
              style={[
                styles.marker,
                spot.is_owner
                  ? styles.ownerMarker
                  : styles.communityMarker,
                selected && styles.markerSelected,
                {
                  left: point.x - 16,
                  top: point.y - 16,
                },
              ]}
              onPress={() => setSelectedSpotId(spot.id)}
            >
              <Ionicons
                name={spotIcon(spot.spot_type)}
                size={17}
                color="#FFFFFF"
              />
            </Pressable>
          );
        })}

        {focusLocation ? (
          <View style={styles.locationPill} pointerEvents="none">
            <Ionicons name="navigate-outline" size={14} color="#FFFFFF" />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {focusLocation.locality || focusLocation.label}
            </Text>
          </View>
        ) : null}

        <View style={styles.zoomControls}>
          <MapControl
            icon="add"
            label="Acercar"
            disabled={zoom >= MAX_ZOOM}
            onPress={() =>
              setZoom((current) => Math.min(MAX_ZOOM, current + 1))
            }
          />
          <View style={styles.controlDivider} />
          <MapControl
            icon="remove"
            label="Alejar"
            disabled={zoom <= MIN_ZOOM}
            onPress={() =>
              setZoom((current) => Math.max(MIN_ZOOM, current - 1))
            }
          />
        </View>

        <View style={styles.panControls}>
          <View style={styles.panRowCenter}>
            <MapControl
              icon="chevron-up"
              label="Mover arriba"
              compact
              onPress={() => pan(0, -PAN_STEP)}
            />
          </View>
          <View style={styles.panRow}>
            <MapControl
              icon="chevron-back"
              label="Mover izquierda"
              compact
              onPress={() => pan(-PAN_STEP, 0)}
            />
            <MapControl
              icon="chevron-down"
              label="Mover abajo"
              compact
              onPress={() => pan(0, PAN_STEP)}
            />
            <MapControl
              icon="chevron-forward"
              label="Mover derecha"
              compact
              onPress={() => pan(PAN_STEP, 0)}
            />
          </View>
        </View>

        <Pressable
          style={styles.recenterButton}
          accessibilityRole="button"
          accessibilityLabel="Volver a la zona seleccionada"
          onPress={recenter}
        >
          <Ionicons name="locate" size={20} color="#173C2C" />
        </Pressable>

        <View style={styles.zoomBadge} pointerEvents="none">
          <Text style={styles.zoomBadgeText}>z{zoom}</Text>
        </View>
      </View>

      <View style={styles.attributionRow}>
        <Text style={styles.attribution}>
          © OpenStreetMap contributors · mapa real para exploración y planificación
        </Text>
      </View>

      {selectedSpot ? (
        <View style={styles.selectedCard}>
          <View
            style={[
              styles.selectedIcon,
              selectedSpot.is_owner
                ? styles.selectedOwnerIcon
                : styles.selectedCommunityIcon,
            ]}
          >
            <Ionicons
              name={spotIcon(selectedSpot.spot_type)}
              size={22}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.selectedContent}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle} numberOfLines={1}>
                {selectedSpot.name}
              </Text>
              <View
                style={[
                  styles.selectedBadge,
                  selectedSpot.is_owner
                    ? styles.selectedOwnerBadge
                    : styles.selectedCommunityBadge,
                ]}
              >
                <Text style={styles.selectedBadgeText}>
                  {selectedSpot.is_owner ? 'Mío' : 'Comunidad'}
                </Text>
              </View>
            </View>

            <Text style={styles.selectedMeta}>
              {typeLabel(selectedSpot.spot_type)} · {privacyLabel(selectedSpot.geo_privacy)}
            </Text>
            <Text style={styles.selectedMeta}>
              {selectedSpot.public_region ?? 'Región no informada'}
            </Text>

            {selectedSpot.description ? (
              <Text style={styles.selectedDescription} numberOfLines={3}>
                {selectedSpot.description}
              </Text>
            ) : null}
          </View>

          <Pressable
            style={styles.centerSpotButton}
            accessibilityRole="button"
            accessibilityLabel={`Centrar mapa en ${selectedSpot.name}`}
            onPress={() => centerOnSpot(selectedSpot)}
          >
            <Ionicons name="locate-outline" size={19} color="#173C2C" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.helperRow}>
          <Ionicons name="information-circle-outline" size={17} color="#66756D" />
          <Text style={styles.helperText}>
            Toca un marcador para ver información del spot. Usa +/− y las flechas para explorar el mapa.
          </Text>
        </View>
      )}
    </View>
  );
}

function MapControl({
  icon,
  label,
  onPress,
  disabled = false,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        compact ? styles.mapControlCompact : styles.mapControl,
        pressed && !disabled && styles.mapControlPressed,
        disabled && styles.mapControlDisabled,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={compact ? 17 : 20} color="#173C2C" />
    </Pressable>
  );
}

function hasCoordinates(
  spot: Spot,
): spot is Spot & { latitude: number; longitude: number } {
  return (
    typeof spot.latitude === 'number' &&
    typeof spot.longitude === 'number'
  );
}

function spotIcon(value: string): keyof typeof Ionicons.glyphMap {
  if (value === 'camping') return 'bonfire-outline';
  if (value === 'access') return 'trail-sign-outline';
  return 'fish-outline';
}

function typeLabel(value: string) {
  if (value === 'camping') return 'Camping';
  if (value === 'access') return 'Acceso';
  return 'Pesca';
}

function privacyLabel(value: string) {
  switch (value) {
    case 'exact':
      return 'Ubicación exacta';
    case 'approx_1km':
      return 'Aprox. 1 km';
    case 'approx_5km':
      return 'Aprox. 5 km';
    case 'region_only':
      return 'Solo región';
    default:
      return 'Privado';
  }
}

function calculateTiles(
  center: LatLon,
  zoom: number,
  size: MapSize,
): Tile[] {
  if (size.width <= 0 || size.height <= 0) return [];

  const n = 2 ** zoom;
  const centerPixel = latLonToWorldPixel(
    center.latitude,
    center.longitude,
    zoom,
  );
  const topLeftX = centerPixel.x - size.width / 2;
  const topLeftY = centerPixel.y - size.height / 2;

  const firstX = Math.floor(topLeftX / TILE_SIZE) - 1;
  const lastX = Math.floor((topLeftX + size.width) / TILE_SIZE) + 1;
  const firstY = Math.floor(topLeftY / TILE_SIZE) - 1;
  const lastY = Math.floor((topLeftY + size.height) / TILE_SIZE) + 1;

  const result: Tile[] = [];

  for (let tileY = firstY; tileY <= lastY; tileY += 1) {
    if (tileY < 0 || tileY >= n) continue;

    for (let tileX = firstX; tileX <= lastX; tileX += 1) {
      const wrappedX = ((tileX % n) + n) % n;

      result.push({
        key: `${zoom}-${tileX}-${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        left: tileX * TILE_SIZE - topLeftX,
        top: tileY * TILE_SIZE - topLeftY,
      });
    }
  }

  return result;
}

function projectToViewport(
  latitude: number,
  longitude: number,
  center: LatLon,
  zoom: number,
  size: MapSize,
) {
  const centerPixel = latLonToWorldPixel(
    center.latitude,
    center.longitude,
    zoom,
  );
  const pointPixel = latLonToWorldPixel(latitude, longitude, zoom);

  return {
    x: size.width / 2 + (pointPixel.x - centerPixel.x),
    y: size.height / 2 + (pointPixel.y - centerPixel.y),
  };
}

function isVisiblePoint(
  point: { x: number; y: number },
  size: MapSize,
  margin: number,
) {
  return (
    point.x >= -margin &&
    point.x <= size.width + margin &&
    point.y >= -margin &&
    point.y <= size.height + margin
  );
}

function latLonToWorldPixel(
  latitude: number,
  longitude: number,
  zoom: number,
) {
  const lat = clampLatitude(latitude);
  const lon = normalizeLongitude(longitude);
  const worldSize = TILE_SIZE * 2 ** zoom;
  const sinLatitude = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * worldSize,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) /
          (4 * Math.PI)) *
      worldSize,
  };
}

function worldPixelToLatLon(
  x: number,
  y: number,
  zoom: number,
): LatLon {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const wrappedX = ((x % worldSize) + worldSize) % worldSize;
  const clampedY = Math.max(0, Math.min(worldSize, y));

  const longitude = (wrappedX / worldSize) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * clampedY) / worldSize;
  const latitude =
    (180 / Math.PI) * Math.atan(Math.sinh(n));

  return {
    latitude: clampLatitude(latitude),
    longitude: normalizeLongitude(longitude),
  };
}

function clampLatitude(value: number) {
  return Math.max(
    -MAX_MERCATOR_LATITUDE,
    Math.min(MAX_MERCATOR_LATITUDE, value),
  );
}

function normalizeLongitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

const styles = StyleSheet.create({
  filters: {
    gap: 8,
    paddingBottom: 11,
  },
  filterChip: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E0E4E0',
    backgroundColor: '#F4F6F3',
  },
  filterChipActive: {
    borderColor: '#D9A441',
    backgroundColor: '#E7C67E',
  },
  filterText: {
    color: '#52655B',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#10261C',
    fontWeight: '900',
  },
  filterCount: {
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7E2',
    paddingHorizontal: 5,
  },
  filterCountActive: {
    backgroundColor: 'rgba(16,38,28,0.12)',
  },
  filterCountText: {
    color: '#405248',
    fontSize: 9,
    fontWeight: '900',
  },
  map: {
    height: 360,
    borderRadius: 19,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#CBD8D0',
    borderWidth: 1,
    borderColor: '#DDE3DE',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,61,45,0.02)',
  },
  marker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  ownerMarker: {
    backgroundColor: '#D9A441',
  },
  communityMarker: {
    backgroundColor: '#315D49',
  },
  markerSelected: {
    borderWidth: 3,
    borderColor: '#10261C',
    transform: [{ scale: 1.16 }],
  },
  focusMarker: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#315D78',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  locationPill: {
    position: 'absolute',
    left: 12,
    top: 12,
    maxWidth: '58%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(16,38,28,0.88)',
  },
  locationPillText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#D9E0DB',
  },
  mapControl: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  mapControlCompact: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#D9E0DB',
  },
  mapControlPressed: {
    opacity: 0.7,
    backgroundColor: '#E3ECE6',
  },
  mapControlDisabled: {
    opacity: 0.35,
  },
  controlDivider: {
    height: 1,
    backgroundColor: '#D9E0DB',
  },
  panControls: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    gap: 4,
  },
  panRowCenter: {
    alignItems: 'center',
  },
  panRow: {
    flexDirection: 'row',
    gap: 4,
  },
  recenterButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: '#D9E0DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadge: {
    position: 'absolute',
    right: 62,
    bottom: 16,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(16,38,28,0.82)',
  },
  zoomBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  attributionRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  attribution: {
    color: '#7B8780',
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'right',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  helperText: {
    flex: 1,
    color: '#76827B',
    fontSize: 10,
    lineHeight: 15,
  },
  selectedCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F7F3',
    borderWidth: 1,
    borderColor: '#E1E6E1',
  },
  selectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOwnerIcon: {
    backgroundColor: '#B68524',
  },
  selectedCommunityIcon: {
    backgroundColor: '#315D49',
  },
  selectedContent: {
    flex: 1,
    minWidth: 0,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: {
    flex: 1,
    color: '#17291F',
    fontSize: 14,
    fontWeight: '900',
  },
  selectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  selectedOwnerBadge: {
    backgroundColor: '#F2E1B9',
  },
  selectedCommunityBadge: {
    backgroundColor: '#E3ECE6',
  },
  selectedBadgeText: {
    color: '#486052',
    fontSize: 8,
    fontWeight: '900',
  },
  selectedMeta: {
    color: '#738078',
    fontSize: 10,
    marginTop: 2,
  },
  selectedDescription: {
    color: '#526159',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  centerSpotButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
