import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import {
  createSpot,
  deleteSpot,
  getOutdoorContext,
  getSpots,
} from '../services/api';
import type { Spot } from '../types/api';

type Privacy =
  | 'private'
  | 'region_only'
  | 'approx_5km'
  | 'exact';

type Visibility = 'private' | 'public';

export function MapScreen({
  token,
}: {
  token: string;
}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spotType, setSpotType] = useState('fishing');
  const [visibility, setVisibility] =
    useState<Visibility>('private');
  const [privacy, setPrivacy] =
    useState<Privacy>('private');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      setSpots(await getSpots(token));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los spots.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function saveSpot() {
    if (!name.trim()) {
      setMessage('Escribe un nombre para el spot.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setMessage(
          'Necesitamos permiso de ubicación para guardar el punto.',
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      let publicRegion: string | null = null;
      try {
        const context = await getOutdoorContext(
          position.coords.latitude,
          position.coords.longitude,
        );
        publicRegion =
          context.location.region ??
          context.location.locality;
      } catch {
        publicRegion = null;
      }

      await createSpot(token, {
        name: name.trim(),
        description: description.trim() || null,
        spot_type: spotType,
        visibility,
        geo_privacy:
          visibility === 'private'
            ? 'private'
            : privacy,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        public_region: publicRegion,
      });

      setName('');
      setDescription('');
      setSpotType('fishing');
      setVisibility('private');
      setPrivacy('private');
      setShowForm(false);
      setMessage('Spot guardado correctamente.');
      await load();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el spot.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSpot(id: string) {
    setMessage('');
    try {
      await deleteSpot(token, id);
      setSpots((current) =>
        current.filter((item) => item.id !== id),
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el spot.',
      );
    }
  }

  const mappableSpots = useMemo(
    () =>
      spots.filter(
        (item) =>
          typeof item.latitude === 'number' &&
          typeof item.longitude === 'number',
      ),
    [spots],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              EXPLORACIÓN
            </Text>
            <Text style={styles.title}>
              Mapa de spots
            </Text>
            <Text style={styles.subtitle}>
              Guarda lugares privados o comparte una ubicación protegida.
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setShowForm((current) => !current)
            }
          >
            <Ionicons
              name={showForm ? 'close' : 'add'}
              size={23}
              color="#173C2C"
            />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeading}>
            <View>
              <Text style={styles.mapTitle}>
                Vista geográfica básica
              </Text>
              <Text style={styles.mapSubtitle}>
                Los marcadores se dibujan solo cuando existe una coordenada visible.
              </Text>
            </View>
            <Pressable
              style={styles.refreshButton}
              onPress={() => void load()}
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color="#315D49"
              />
            </Pressable>
          </View>

          <SpotMapPreview spots={mappableSpots} />

          <View style={styles.mapLegend}>
            <Legend color="#D9A441" text="Mis spots" />
            <Legend color="#315D49" text="Comunidad" />
            <Text style={styles.mapNote}>
              Esta versión usa PostGIS para guardar y proteger coordenadas. Más adelante puede conectarse a cartografía con tiles reales.
            </Text>
          </View>
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              Guardar spot actual
            </Text>

            <Field
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="Ej.: Poza del puente"
            />

            <Text style={styles.fieldLabel}>
              Descripción
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Acceso, tipo de agua, observaciones…"
              placeholderTextColor="#8A958E"
              multiline
            />

            <Text style={styles.groupLabel}>
              Tipo de lugar
            </Text>
            <View style={styles.optionRow}>
              <Option
                active={spotType === 'fishing'}
                icon="fish-outline"
                label="Pesca"
                onPress={() => setSpotType('fishing')}
              />
              <Option
                active={spotType === 'camping'}
                icon="bonfire-outline"
                label="Camping"
                onPress={() => setSpotType('camping')}
              />
              <Option
                active={spotType === 'access'}
                icon="trail-sign-outline"
                label="Acceso"
                onPress={() => setSpotType('access')}
              />
            </View>

            <Text style={styles.groupLabel}>
              Visibilidad
            </Text>
            <View style={styles.optionRow}>
              <Option
                active={visibility === 'private'}
                icon="lock-closed-outline"
                label="Solo yo"
                onPress={() => {
                  setVisibility('private');
                  setPrivacy('private');
                }}
              />
              <Option
                active={visibility === 'public'}
                icon="earth-outline"
                label="Comunidad"
                onPress={() => {
                  setVisibility('public');
                  if (privacy === 'private') {
                    setPrivacy('region_only');
                  }
                }}
              />
            </View>

            {visibility === 'public' ? (
              <>
                <Text style={styles.groupLabel}>
                  Precisión pública
                </Text>
                <View style={styles.optionRow}>
                  <Option
                    active={privacy === 'region_only'}
                    icon="map-outline"
                    label="Solo región"
                    onPress={() => setPrivacy('region_only')}
                  />
                  <Option
                    active={privacy === 'approx_5km'}
                    icon="navigate-outline"
                    label="Aprox. 5 km"
                    onPress={() => setPrivacy('approx_5km')}
                  />
                  <Option
                    active={privacy === 'exact'}
                    icon="location-outline"
                    label="Exacta"
                    onPress={() => setPrivacy('exact')}
                  />
                </View>
              </>
            ) : null}

            <Pressable
              style={[
                styles.saveButton,
                saving && styles.disabled,
              ]}
              disabled={saving}
              onPress={() => void saveSpot()}
            >
              {saving ? (
                <ActivityIndicator color="#10261C" />
              ) : (
                <>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#10261C"
                  />
                  <Text style={styles.saveButtonText}>
                    Guardar mi ubicación actual
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {message ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Spots disponibles
            </Text>
            <Text style={styles.sectionSubtitle}>
              Tus puntos y los compartidos por la comunidad
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#D9A441"
            />
          </View>
        ) : null}

        {!loading && spots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="map-outline"
              size={36}
              color="#315D49"
            />
            <Text style={styles.emptyTitle}>
              Aún no hay spots guardados
            </Text>
            <Text style={styles.emptyText}>
              Pulsa + para guardar tu primer lugar.
            </Text>
          </View>
        ) : null}

        {spots.map((spot) => (
          <View
            key={spot.id}
            style={styles.spotCard}
          >
            <View style={styles.spotIcon}>
              <Ionicons
                name={
                  spot.spot_type === 'camping'
                    ? 'bonfire-outline'
                    : spot.spot_type === 'access'
                      ? 'trail-sign-outline'
                      : 'fish-outline'
                }
                size={24}
                color="#D9A441"
              />
            </View>

            <View style={styles.spotContent}>
              <View style={styles.spotTop}>
                <Text style={styles.spotName}>
                  {spot.name}
                </Text>
                <View
                  style={[
                    styles.badge,
                    spot.is_owner
                      ? styles.ownerBadge
                      : styles.communityBadge,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {spot.is_owner ? 'Mío' : 'Comunidad'}
                  </Text>
                </View>
              </View>

              <Text style={styles.spotMeta}>
                {privacyLabel(spot.geo_privacy)} · {spot.public_region ?? 'Región no informada'}
              </Text>

              {spot.description ? (
                <Text style={styles.spotDescription}>
                  {spot.description}
                </Text>
              ) : null}

              {typeof spot.latitude === 'number' &&
              typeof spot.longitude === 'number' ? (
                <Text style={styles.coordinates}>
                  {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                </Text>
              ) : (
                <Text style={styles.coordinates}>
                  Coordenadas protegidas
                </Text>
              )}
            </View>

            {spot.is_owner ? (
              <Pressable
                style={styles.deleteButton}
                onPress={() => void removeSpot(spot.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#9B463A"
                />
              </Pressable>
            ) : null}
          </View>
        ))}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
}

function SpotMapPreview({
  spots,
}: {
  spots: Spot[];
}) {
  const [size, setSize] = useState({
    width: 0,
    height: 300,
  });

  const bounds = useMemo(() => {
    if (spots.length === 0) return null;

    const latitudes = spots
      .map((item) => item.latitude)
      .filter((value): value is number =>
        typeof value === 'number',
      );
    const longitudes = spots
      .map((item) => item.longitude)
      .filter((value): value is number =>
        typeof value === 'number',
      );

    if (
      latitudes.length === 0 ||
      longitudes.length === 0
    ) {
      return null;
    }

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    return {
      minLat,
      maxLat,
      minLon,
      maxLon,
    };
  }, [spots]);

  return (
    <View
      style={styles.mapPreview}
      onLayout={(event: LayoutChangeEvent) => {
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        });
      }}
    >
      <View style={styles.gridLineH1} />
      <View style={styles.gridLineH2} />
      <View style={styles.gridLineV1} />
      <View style={styles.gridLineV2} />

      {spots.length === 0 ? (
        <View style={styles.mapEmpty}>
          <Ionicons
            name="compass-outline"
            size={38}
            color="#6A8477"
          />
          <Text style={styles.mapEmptyText}>
            Los spots con coordenadas visibles aparecerán aquí.
          </Text>
        </View>
      ) : null}

      {bounds
        ? spots.map((spot) => {
            if (
              typeof spot.latitude !== 'number' ||
              typeof spot.longitude !== 'number'
            ) {
              return null;
            }

            const latRange =
              bounds.maxLat - bounds.minLat || 0.01;
            const lonRange =
              bounds.maxLon - bounds.minLon || 0.01;

            const x =
              (spot.longitude - bounds.minLon) /
              lonRange;
            const y =
              1 -
              (spot.latitude - bounds.minLat) /
                latRange;

            const left =
              14 +
              x * Math.max(size.width - 42, 0);
            const top =
              14 +
              y * Math.max(size.height - 42, 0);

            return (
              <View
                key={spot.id}
                style={[
                  styles.mapMarker,
                  {
                    left,
                    top,
                    backgroundColor: spot.is_owner
                      ? '#D9A441'
                      : '#315D49',
                  },
                ]}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            );
          })
        : null}
    </View>
  );
}

function Legend({
  color,
  text,
}: {
  color: string;
  text: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
        ]}
      />
      <Text style={styles.legendText}>
        {text}
      </Text>
    </View>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#8A958E"
      />
    </View>
  );
}

function Option({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.option,
        active && styles.optionActive,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? '#10261C' : '#52655B'}
      />
      <Text
        style={[
          styles.optionText,
          active && styles.optionTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0E5',
  },
  page: {
    flexGrow: 1,
    backgroundColor: '#F4F0E5',
  },
  container: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#A3652E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: '#15271E',
    fontSize: 29,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: '#6D7A72',
    marginTop: 3,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0E9E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 15,
    marginBottom: 16,
  },
  mapHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  mapTitle: {
    color: '#17291F',
    fontSize: 18,
    fontWeight: '900',
  },
  mapSubtitle: {
    color: '#758078',
    fontSize: 11,
    marginTop: 2,
  },
  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    height: 300,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#DDE7DF',
    position: 'relative',
  },
  gridLineH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: 'rgba(49,93,73,0.15)',
  },
  gridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 1,
    backgroundColor: 'rgba(49,93,73,0.15)',
  },
  gridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: 'rgba(49,93,73,0.15)',
  },
  gridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 1,
    backgroundColor: 'rgba(49,93,73,0.15)',
  },
  mapEmpty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },
  mapEmptyText: {
    color: '#64766D',
    textAlign: 'center',
    maxWidth: 360,
    marginTop: 8,
  },
  mapMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 11,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: '#66756D',
    fontSize: 10,
    fontWeight: '700',
  },
  mapNote: {
    flexBasis: 300,
    flexGrow: 1,
    color: '#879089',
    fontSize: 10,
    lineHeight: 15,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 19,
    marginBottom: 16,
  },
  formTitle: {
    color: '#17291F',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 15,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#4C5D53',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DDE2DC',
    borderRadius: 13,
    backgroundColor: '#F8F8F4',
    paddingHorizontal: 13,
    color: '#1B2D23',
  },
  textArea: {
    minHeight: 95,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  groupLabel: {
    color: '#4C5D53',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 7,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 7,
  },
  option: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: '#EEF1ED',
    borderWidth: 1,
    borderColor: '#E0E4E0',
  },
  optionActive: {
    backgroundColor: '#E7C67E',
    borderColor: '#D9A441',
  },
  optionText: {
    color: '#52655B',
    fontSize: 12,
    fontWeight: '800',
  },
  optionTextActive: {
    color: '#10261C',
    fontWeight: '900',
  },
  saveButton: {
    minHeight: 52,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#D9A441',
  },
  saveButtonText: {
    color: '#10261C',
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },
  messageCard: {
    backgroundColor: '#F5E9D9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
  },
  messageText: {
    color: '#80572D',
    fontSize: 12,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#17291F',
    fontSize: 21,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#728078',
    marginTop: 3,
  },
  loadingCard: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    minHeight: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  emptyTitle: {
    color: '#17291F',
    fontWeight: '900',
    fontSize: 17,
    marginTop: 9,
  },
  emptyText: {
    color: '#718078',
    marginTop: 4,
  },
  spotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  spotIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotContent: {
    flex: 1,
  },
  spotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotName: {
    flex: 1,
    color: '#17291F',
    fontWeight: '900',
    fontSize: 15,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ownerBadge: {
    backgroundColor: '#F2E1B9',
  },
  communityBadge: {
    backgroundColor: '#E3ECE6',
  },
  badgeText: {
    color: '#486052',
    fontSize: 9,
    fontWeight: '900',
  },
  spotMeta: {
    color: '#738078',
    fontSize: 11,
    marginTop: 3,
  },
  spotDescription: {
    color: '#5F6E65',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  coordinates: {
    color: '#8A938D',
    fontSize: 10,
    marginTop: 7,
  },
  deleteButton: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#F7E5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpace: {
    height: 35,
  },
});
