import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import {
  getOutdoorContext,
  getSolunar,
  getWeather,
  type OutdoorContext,
} from '../services/api';

type WeatherResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current_units?: {
    temperature_2m?: string;
    apparent_temperature?: string;
    relative_humidity_2m?: string;
    precipitation?: string;
    pressure_msl?: string;
    wind_speed_10m?: string;
    wind_gusts_10m?: string;
  };
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    pressure_msl?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
};

type SolunarResponse = {
  date?: string;
  moon_phase_fraction?: number;
  moon_illumination?: number;
  phase_name?: string;
  activity_index?: number;
  activity_index_note?: string;
};

export function ConditionsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [solunar, setSolunar] = useState<SolunarResponse | null>(null);
  const [outdoorContext, setOutdoorContext] =
    useState<OutdoorContext | null>(null);
  const [error, setError] = useState('');

  async function loadConditions() {
    setLoading(true);
    setError('');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setError(
          'Necesitamos permiso de ubicación para consultar las condiciones de tu zona.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [
        weatherResult,
        solunarResult,
        contextResult,
      ] = await Promise.all([
        getWeather(
          position.coords.latitude,
          position.coords.longitude,
        ),
        getSolunar(),
        getOutdoorContext(
          position.coords.latitude,
          position.coords.longitude,
        ),
      ]);

      setWeather(weatherResult as WeatherResponse);
      setSolunar(solunarResult as SolunarResponse);
      setOutdoorContext(contextResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las condiciones.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConditions();
  }, []);

  const activityLabel = useMemo(() => {
    const score = solunar?.activity_index ?? 0;

    if (score >= 75) return 'Muy favorable';
    if (score >= 60) return 'Favorable';
    if (score >= 45) return 'Moderada';
    return 'Baja';
  }, [solunar]);

  const current = weather?.current;
  const units = weather?.current_units;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={onBack}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.topTitle}>
            <Text style={styles.eyebrow}>PESCA & OUTDOOR</Text>
            <Text style={styles.title}>Condiciones de hoy</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={loadConditions}
          >
            <Ionicons
              name="refresh"
              size={21}
              color="#173C2C"
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#D9A441" />
            <Text style={styles.stateTitle}>
              Consultando tu ubicación y el clima…
            </Text>
            <Text style={styles.stateText}>
              La primera vez el navegador o el teléfono te pedirá permiso para
              usar tu ubicación.
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="warning-outline"
              size={30}
              color="#A14D3C"
            />
            <Text style={styles.errorTitle}>
              No pudimos obtener las condiciones
            </Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
              onPress={loadConditions}
            >
              <Text style={styles.retryText}>Intentar nuevamente</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && current ? (
          <>
            <LinearGradient
              colors={['#163F2F', '#0B261C']}
              style={styles.hero}
            >
              <View style={styles.heroHeader}>
                <View style={styles.heroHeading}>
                  <Text style={styles.heroEyebrow}>
                    UBICACIÓN APROXIMADA
                  </Text>

                  <View style={styles.locationLine}>
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color="#D9A441"
                    />
                    <Text style={styles.locationText}>
                      {outdoorContext?.location?.label ??
                        'Tu zona actual'}
                    </Text>
                  </View>

                  <Text style={styles.heroTitle}>
                    {activityLabel}
                  </Text>
                </View>

                <View style={styles.activityBadge}>
                  <Text style={styles.activityScore}>
                    {solunar?.activity_index ?? '—'}
                  </Text>
                  <Text style={styles.activityMax}>/100</Text>
                </View>
              </View>

              <Text style={styles.heroDescription}>
                Índice orientativo basado en condiciones ambientales y fase
                lunar. No representa una probabilidad garantizada de captura.
              </Text>

              <View style={styles.heroMetrics}>
                <Metric
                  icon="thermometer-outline"
                  label="Temperatura"
                  value={formatValue(
                    current.temperature_2m,
                    units?.temperature_2m ?? '°C',
                  )}
                />

                <Metric
                  icon="navigate-outline"
                  label="Viento"
                  value={formatValue(
                    current.wind_speed_10m,
                    units?.wind_speed_10m ?? 'km/h',
                  )}
                />

                <Metric
                  icon="water-outline"
                  label="Humedad"
                  value={formatValue(
                    current.relative_humidity_2m,
                    units?.relative_humidity_2m ?? '%',
                  )}
                />
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Condiciones actuales</Text>

            <View style={styles.grid}>
              <ConditionCard
                icon="thermometer-outline"
                title="Sensación"
                value={formatValue(
                  current.apparent_temperature,
                  units?.apparent_temperature ?? '°C',
                )}
              />

              <ConditionCard
                icon="rainy-outline"
                title="Precipitación"
                value={formatValue(
                  current.precipitation,
                  units?.precipitation ?? 'mm',
                )}
              />

              <ConditionCard
                icon="speedometer-outline"
                title="Presión"
                value={formatValue(
                  current.pressure_msl,
                  units?.pressure_msl ?? 'hPa',
                )}
              />

              <ConditionCard
                icon="flag-outline"
                title="Ráfagas"
                value={formatValue(
                  current.wind_gusts_10m,
                  units?.wind_gusts_10m ?? 'km/h',
                )}
              />
            </View>

            <Text style={styles.sectionTitle}>Solunar</Text>

            <View style={styles.solunarCard}>
              <View style={styles.moonIcon}>
                <Ionicons
                  name="moon-outline"
                  size={30}
                  color="#D9A441"
                />
              </View>

              <View style={styles.solunarContent}>
                <Text style={styles.solunarPhase}>
                  {solunar?.phase_name ?? 'Fase lunar'}
                </Text>
                <Text style={styles.solunarDetail}>
                  Iluminación aproximada:{' '}
                  {typeof solunar?.moon_illumination === 'number'
                    ? `${Math.round(solunar.moon_illumination * 100)}%`
                    : '—'}
                </Text>
                <Text style={styles.solunarDetail}>
                  Índice de actividad: {solunar?.activity_index ?? '—'}/100
                </Text>
              </View>
            </View>

            <View style={styles.privacyCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#35664D"
              />
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>
                  Tu ubicación exacta no se publica
                </Text>
                <Text style={styles.privacyText}>
                  La usamos en esta consulta para obtener condiciones locales.
                  No la estamos mostrando en esta pantalla ni compartiendo con
                  otros usuarios.
                </Text>
              </View>
            </View>

            <Text style={styles.providerNote}>
              El clima proviene del servicio conectado al backend de Pesca &
              Outdoor. La ubicación mostrada es aproximada (
              {outdoorContext?.location.provider ??
                'proveedor de geocodificación'}
              ) y el índice solunar es heurístico y orientativo.
            </Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color="#D9A441" />
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ConditionCard({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.conditionCard}>
      <View style={styles.conditionIcon}>
        <Ionicons name={icon} size={23} color="#174A36" />
      </View>
      <Text style={styles.conditionTitle}>{title}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
  );
}

function formatValue(
  value: number | undefined,
  unit: string,
) {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 10) / 10} ${unit}`;
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
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  topTitle: {
    flex: 1,
  },
  eyebrow: {
    color: '#A3652E',
    fontWeight: '900',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  title: {
    color: '#15271E',
    fontWeight: '900',
    fontSize: 28,
    marginTop: 3,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#123D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0E9E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }],
  },
  stateCard: {
    minHeight: 300,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  stateTitle: {
    color: '#17291F',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    color: '#718078',
    maxWidth: 520,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: 24,
    backgroundColor: '#F8E8E3',
    padding: 26,
    alignItems: 'center',
  },
  errorTitle: {
    color: '#6D2E24',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },
  errorText: {
    color: '#84554D',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 600,
  },
  retryButton: {
    backgroundColor: '#D9A441',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 18,
  },
  retryText: {
    color: '#10261C',
    fontWeight: '900',
  },
  hero: {
    borderRadius: 28,
    padding: 26,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 15,
  },
  heroHeading: {
    flex: 1,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  locationText: {
    color: '#E9F0EC',
    fontSize: 13,
    fontWeight: '800',
  },
  heroEyebrow: {
    color: '#C3D2C9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  heroDescription: {
    color: '#D3DED8',
    maxWidth: 700,
    lineHeight: 20,
    marginTop: 10,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  activityScore: {
    color: '#D9A441',
    fontWeight: '900',
    fontSize: 27,
  },
  activityMax: {
    color: '#D4DDD8',
    fontWeight: '700',
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  metricValue: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  metricLabel: {
    color: '#C4D0C9',
    fontSize: 11,
    marginTop: 1,
  },
  sectionTitle: {
    color: '#17291F',
    fontWeight: '900',
    fontSize: 21,
    marginTop: 28,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  conditionCard: {
    flexGrow: 1,
    flexBasis: 190,
    minHeight: 145,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 17,
  },
  conditionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#E4EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionTitle: {
    color: '#758179',
    fontSize: 12,
    marginTop: 13,
  },
  conditionValue: {
    color: '#182A20',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },
  solunarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  moonIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#183B2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solunarContent: {
    flex: 1,
  },
  solunarPhase: {
    color: '#18291F',
    fontSize: 19,
    fontWeight: '900',
  },
  solunarDetail: {
    color: '#6D7A72',
    marginTop: 4,
  },
  privacyCard: {
    marginTop: 22,
    backgroundColor: '#E3ECE6',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    color: '#244B38',
    fontWeight: '900',
  },
  privacyText: {
    color: '#5B7164',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  providerNote: {
    color: '#859088',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
});
