import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ExplorationBar } from '../components/ExplorationPicker';
import {
  formatExplorationDate,
  isToday,
  useExploration,
} from '../context/ExplorationContext';

import {
  getOutdoorContext,
  getSolunar,
  getWeather,
  type OutdoorContext,
} from '../services/api';

const CONDITIONS_VIDEO = require('../../assets/videos/paisaje-condiciones.mp4');
const CONDITIONS_VIDEO_URI = Asset.fromModule(CONDITIONS_VIDEO).uri;

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
  selected_day?: {
    date?: string;
    weather_code?: number;
    temperature_2m_max?: number;
    temperature_2m_min?: number;
    precipitation_sum?: number;
    precipitation_probability_max?: number;
    wind_speed_10m_max?: number;
    wind_gusts_10m_max?: number;
    sunrise?: string;
    sunset?: string;
  } | null;
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
  const {
    mode,
    place,
    selectedDate,
    hydrated,
    ensureGpsLocation,
  } = useExploration();

  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [solunar, setSolunar] = useState<SolunarResponse | null>(null);
  const [outdoorContext, setOutdoorContext] =
    useState<OutdoorContext | null>(null);
  const [error, setError] = useState('');

  const conditionsVideoPlayer = useVideoPlayer(CONDITIONS_VIDEO, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  async function loadConditions(requestPermission = false) {
    setLoading(true);
    setError('');

    try {
      let target = place;

      if (!target && mode === 'gps') {
        target = await ensureGpsLocation(requestPermission);
      }

      if (!target) {
        setError(
          'Activa tu ubicación o elige manualmente una zona para consultar las condiciones.',
        );
        return;
      }

      const [
        weatherResult,
        solunarResult,
        contextResult,
      ] = await Promise.all([
        getWeather(
          target.latitude,
          target.longitude,
          selectedDate,
        ),
        getSolunar(selectedDate),
        getOutdoorContext(
          target.latitude,
          target.longitude,
          selectedDate,
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
    if (!hydrated) return;
    void loadConditions(false);
  }, [
    hydrated,
    mode,
    place?.latitude,
    place?.longitude,
    selectedDate,
  ]);

  const activityLabel = useMemo(() => {
    const score = solunar?.activity_index ?? 0;

    if (score >= 75) return 'Muy favorable';
    if (score >= 60) return 'Favorable';
    if (score >= 45) return 'Moderada';
    return 'Baja';
  }, [solunar]);

  const solunarGuidance = useMemo(
    () =>
      getSolunarGuidance(
        solunar?.activity_index ?? 0,
        solunar?.phase_name ?? 'Fase lunar',
      ),
    [solunar?.activity_index, solunar?.phase_name],
  );

  const current = weather?.current;
  const units = weather?.current_units;
  const planned = weather?.selected_day;
  const future = !isToday(selectedDate);

  const hasWeather = future ? Boolean(planned) : Boolean(current);

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
            <Text style={styles.title}>
              {isToday(selectedDate)
                ? 'Condiciones de hoy'
                : `Condiciones · ${formatExplorationDate(selectedDate)}`}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={() => void loadConditions(false)}
          >
            <Ionicons
              name="refresh"
              size={21}
              color="#173C2C"
            />
          </Pressable>
        </View>

        <ExplorationBar />

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#D9A441" />
            <Text style={styles.stateTitle}>
              Consultando la zona y las condiciones…
            </Text>
            <Text style={styles.stateText}>
              Puedes usar el GPS del dispositivo o una localidad elegida manualmente.
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
              onPress={() => void loadConditions(true)}
            >
              <Text style={styles.retryText}>Intentar nuevamente</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !hasWeather ? (
          <View style={styles.stateCard}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color="#315D49"
            />
            <Text style={styles.stateTitle}>
              Pronóstico todavía no disponible
            </Text>
            <Text style={styles.stateText}>
              Para fechas más lejanas podemos mostrar temporadas y solunar, pero el pronóstico meteorológico solo está disponible dentro de la ventana que entrega el proveedor.
            </Text>
          </View>
        ) : null}

        {!loading && !error && hasWeather ? (
          <>
            <View style={styles.hero}>
              {Platform.OS === 'web' ? (
                <video
                  src={CONDITIONS_VIDEO_URI}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  style={webHeroVideoStyle}
                />
              ) : (
                <VideoView
                  player={conditionsVideoPlayer}
                  style={styles.heroVideo}
                  contentFit="cover"
                  nativeControls={false}
                />
              )}

              <LinearGradient
                colors={[
                  'rgba(4,22,17,0.20)',
                  'rgba(4,22,17,0.82)',
                ]}
                style={styles.heroOverlay}
              />

              <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroHeading}>
                  <Text style={styles.heroEyebrow}>
                    {mode === 'manual'
                      ? 'ZONA SELECCIONADA'
                      : 'UBICACIÓN APROXIMADA'}
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
                  label={future ? 'Temp. máxima' : 'Temperatura'}
                  value={formatValue(
                    future
                      ? planned?.temperature_2m_max
                      : current?.temperature_2m,
                    '°C',
                  )}
                />

                <Metric
                  icon="navigate-outline"
                  label={future ? 'Viento máximo' : 'Viento'}
                  value={formatValue(
                    future
                      ? planned?.wind_speed_10m_max
                      : current?.wind_speed_10m,
                    'km/h',
                  )}
                />

                <Metric
                  icon={future ? 'rainy-outline' : 'water-outline'}
                  label={future ? 'Prob. lluvia' : 'Humedad'}
                  value={formatValue(
                    future
                      ? planned?.precipitation_probability_max
                      : current?.relative_humidity_2m,
                    '%',
                  )}
                />
              </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {future
                ? `Pronóstico para ${formatExplorationDate(selectedDate)}`
                : 'Condiciones actuales'}
            </Text>

            <View style={styles.grid}>
              {future ? (
                <>
                  <ConditionCard
                    icon="thermometer-outline"
                    title="Temperatura mínima"
                    value={formatValue(planned?.temperature_2m_min, '°C')}
                  />
                  <ConditionCard
                    icon="rainy-outline"
                    title="Precipitación total"
                    value={formatValue(planned?.precipitation_sum, 'mm')}
                  />
                  <ConditionCard
                    icon="umbrella-outline"
                    title="Probabilidad de lluvia"
                    value={formatValue(
                      planned?.precipitation_probability_max,
                      '%',
                    )}
                  />
                  <ConditionCard
                    icon="flag-outline"
                    title="Ráfagas máximas"
                    value={formatValue(planned?.wind_gusts_10m_max, 'km/h')}
                  />
                </>
              ) : (
                <>
                  <ConditionCard
                    icon="thermometer-outline"
                    title="Sensación"
                    value={formatValue(
                      current?.apparent_temperature,
                      units?.apparent_temperature ?? '°C',
                    )}
                  />
                  <ConditionCard
                    icon="rainy-outline"
                    title="Precipitación"
                    value={formatValue(
                      current?.precipitation,
                      units?.precipitation ?? 'mm',
                    )}
                  />
                  <ConditionCard
                    icon="speedometer-outline"
                    title="Presión"
                    value={formatValue(
                      current?.pressure_msl,
                      units?.pressure_msl ?? 'hPa',
                    )}
                  />
                  <ConditionCard
                    icon="flag-outline"
                    title="Ráfagas"
                    value={formatValue(
                      current?.wind_gusts_10m,
                      units?.wind_gusts_10m ?? 'km/h',
                    )}
                  />
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Solunar</Text>

            <View style={styles.solunarCard}>
              <View style={styles.solunarTop}>
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

                <View
                  style={[
                    styles.fishingStatusBadge,
                    { backgroundColor: solunarGuidance.badgeBackground },
                  ]}
                >
                  <Ionicons
                    name="fish-outline"
                    size={17}
                    color={solunarGuidance.badgeColor}
                  />
                  <Text
                    style={[
                      styles.fishingStatusText,
                      { color: solunarGuidance.badgeColor },
                    ]}
                  >
                    Pesca: {solunarGuidance.label}
                  </Text>
                </View>
              </View>

              <View style={styles.solunarProgressTrack}>
                <View
                  style={[
                    styles.solunarProgressFill,
                    {
                      width: `${Math.max(
                        0,
                        Math.min(100, solunar?.activity_index ?? 0),
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.solunarExplanation}>
                {solunarGuidance.summary}
              </Text>

              <View style={styles.solunarTipsGrid}>
                <View style={styles.solunarTip}>
                  <View style={styles.solunarTipIcon}>
                    <Ionicons name="time-outline" size={19} color="#315D49" />
                  </View>
                  <View style={styles.solunarTipContent}>
                    <Text style={styles.solunarTipTitle}>Cuándo probar</Text>
                    <Text style={styles.solunarTipText}>
                      {solunarGuidance.when}
                    </Text>
                  </View>
                </View>

                <View style={styles.solunarTip}>
                  <View style={styles.solunarTipIcon}>
                    <Ionicons name="location-outline" size={19} color="#315D49" />
                  </View>
                  <View style={styles.solunarTipContent}>
                    <Text style={styles.solunarTipTitle}>Dónde probar</Text>
                    <Text style={styles.solunarTipText}>
                      {solunarGuidance.where}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.solunarNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color="#6D7A72"
                />
                <Text style={styles.solunarNoticeText}>
                  La fase lunar y el índice solunar son orientativos. No
                  garantizan capturas; conviene combinarlos con clima,
                  temperatura, viento y experiencia local.
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
                  {mode === 'manual'
                    ? 'Estás explorando una zona manual'
                    : 'Tu ubicación exacta no se publica'}
                </Text>
                <Text style={styles.privacyText}>
                  {mode === 'manual'
                    ? 'Esta consulta usa el centro aproximado de la localidad elegida. No modifica la ubicación real de tus capturas o spots.'
                    : 'La usamos en esta consulta para obtener condiciones locales. No la mostramos ni la compartimos con otros usuarios.'}
                </Text>
              </View>
            </View>

            <Text style={styles.providerNote}>
              El clima proviene del servicio conectado al backend de Pesca &
              Outdoor. La ubicación mostrada es aproximada (
              {outdoorContext?.location.provider ??
                'proveedor de geocodificación'}
              ) · consulta {formatExplorationDate(selectedDate)} · el índice solunar es heurístico y orientativo.
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


function getSolunarGuidance(score: number, phaseName: string) {
  if (score >= 75) {
    return {
      label: 'Muy favorable',
      badgeColor: '#17603A',
      badgeBackground: '#DDF0E3',
      summary: `El índice está alto (${score}/100). ${phaseName} forma parte del cálculo y, junto con las condiciones ambientales, sugiere una ventana interesante para planificar una salida.`,
      when:
        'Prioriza amanecer y atardecer, especialmente con viento y temperatura estables.',
      where:
        'Busca entradas y salidas de corriente, cambios de profundidad, estructuras sumergidas y bordes con vegetación o sombra.',
    };
  }

  if (score >= 60) {
    return {
      label: 'Favorable',
      badgeColor: '#276342',
      badgeBackground: '#E3F0E6',
      summary: `El índice está en un rango favorable (${score}/100). ${phaseName} aporta al cálculo, pero conviene leerlo junto con las condiciones reales del agua.`,
      when:
        'Amanecer y atardecer son buenos puntos de partida. Observa viento, nubosidad y temperatura.',
      where:
        'Prueba sectores con corriente moderada, desembocaduras, orillas con cobertura y cambios de profundidad.',
    };
  }

  if (score >= 45) {
    return {
      label: 'Moderada',
      badgeColor: '#8B6118',
      badgeBackground: '#F5EACF',
      summary: `El índice está en un rango moderado (${score}/100). No es una señal negativa: conviene elegir mejor el horario y el sector, y apoyarse más en las condiciones del agua.`,
      when:
        'Da prioridad al amanecer o al atardecer y observa viento, temperatura y actividad visible.',
      where:
        'Concentra los intentos en pozones, remansos, entradas o salidas de corriente, cambios de profundidad y zonas con refugio.',
    };
  }

  return {
    label: 'Baja',
    badgeColor: '#8C453A',
    badgeBackground: '#F7E5E1',
    summary: `El índice está bajo (${score}/100). Eso no significa que no puedas pescar, pero la señal solunar es menos favorable y conviene apoyarse más en clima, técnica y conocimiento del lugar.`,
    when:
      'Busca las horas con mejores condiciones ambientales, especialmente amanecer o atardecer.',
    where:
      'Prioriza pozones, estructuras, sombra, vegetación, cambios de corriente y zonas de refugio.',
  };
}

function formatValue(
  value: number | undefined,
  unit: string,
) {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 10) / 10} ${unit}`;
}


const webHeroVideoStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  display: 'block',
  borderRadius: 28,
  pointerEvents: 'none' as const,
};

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
    minHeight: 270,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: '#0B261C',
  },
  heroVideo: {
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
  },
  heroContent: {
    position: 'relative',
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
    gap: 16,
  },
  solunarTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    minWidth: 140,
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
  fishingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fishingStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  solunarProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E3ECE6',
    overflow: 'hidden',
  },
  solunarProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#D9A441',
  },
  solunarExplanation: {
    color: '#315D49',
    fontSize: 14,
    lineHeight: 21,
  },
  solunarTipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  solunarTip: {
    flexGrow: 1,
    flexBasis: 220,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#F1F6F2',
    padding: 14,
  },
  solunarTipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solunarTipContent: {
    flex: 1,
  },
  solunarTipTitle: {
    color: '#244B38',
    fontSize: 13,
    fontWeight: '800',
  },
  solunarTipText: {
    color: '#5B7164',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  solunarNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  solunarNoticeText: {
    flex: 1,
    color: '#6D7A72',
    fontSize: 12,
    lineHeight: 18,
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
