import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Location from 'expo-location';

import { ShareMenu } from '../components/ShareMenu';
import { AnimatedBackground } from '../components/AnimatedBackground';
import {
  getAffiliateRecommendations,
  getCredentials,
  getOutdoorContext,
  getSolunar,
  getTrophies,
  getTrophyImageDataUrl,
  getWeather,
  type CredentialRecord,
  type OutdoorContext,
  type SeasonSummary,
} from '../services/api';
import type { AffiliateRecommendation, Trophy } from '../types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ShareTarget = {
  title: string;
  text: string;
  url: string;
};

type HomeScreenProps = {
  token: string;
  onOpenConditions: () => void;
  onOpenCredentials: () => void;
  onOpenDeals: () => void;
  onOpenMap: () => void;
  onOpenCapture: () => void;
  onOpenWall: () => void;
};

const HERO_VIDEO = require('../../assets/videos/video-trucha-home.mp4');

const TROPHY_DEMO =
  'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1400&q=85';

const PUBLIC_WEB_URL = 'https://pescaoutdoor.cl';


type SpeciesInfo = {
  key: string;
  label: string;
  image: number;
  habitat: string;
  description: string;
  environment: 'Agua dulce' | 'Mar / costa';
};

const SPECIES_LIBRARY: [SpeciesInfo, ...SpeciesInfo[]] = [
  {
    key: 'trucha-arcoiris',
    label: 'Trucha arcoíris',
    image: require('../../assets/species/trucha-arcoiris.png'),
    habitat: 'Ríos, lagos y esteros fríos y bien oxigenados.',
    description:
      'Salmonídeo muy apreciado en pesca recreativa. En Chile es especialmente frecuente en aguas interiores del centro-sur y sur.',
    environment: 'Agua dulce',
  },
  {
    key: 'trucha-fario',
    label: 'Trucha fario',
    image: require('../../assets/species/trucha-fario.jpg'),
    habitat: 'Ríos de corriente, pozones, lagos y sectores con refugio.',
    description:
      'También conocida como trucha café. Prefiere aguas frías y suele ocupar sectores con estructura, sombra y cambios de corriente.',
    environment: 'Agua dulce',
  },
  {
    key: 'carpa',
    label: 'Carpa',
    image: require('../../assets/species/carpa.png'),
    habitat: 'Lagunas, embalses y sectores de corriente lenta.',
    description:
      'Pez resistente de aguas tranquilas o templadas. Puede encontrarse en fondos blandos y zonas con vegetación.',
    environment: 'Agua dulce',
  },
  {
    key: 'pejerrey',
    label: 'Pejerrey',
    image: require('../../assets/species/pejerrey.png'),
    habitat: 'Lagunas, lagos, estuarios y algunos ambientes costeros.',
    description:
      'Pez alargado y veloz. Según la especie puede ocupar ambientes de agua dulce, salobre o marinos.',
    environment: 'Agua dulce',
  },
  {
    key: 'perca',
    label: 'Perca / trucha negra',
    image: require('../../assets/species/perca.png'),
    habitat: 'Ríos y lagos del sur de Chile.',
    description:
      'Pez nativo de aguas continentales australes. En la app lo usamos como referencia visual para registros locales de perca o “trucha negra”.',
    environment: 'Agua dulce',
  },
  {
    key: 'salmon-chinook',
    label: 'Salmón Chinook',
    image: require('../../assets/species/salmon-chinook.png'),
    habitat: 'Ríos grandes, desembocaduras y ambientes marinos durante su ciclo de vida.',
    description:
      'Salmón de gran tamaño muy valorado por pescadores recreativos. La regulación puede variar por cuenca y temporada.',
    environment: 'Agua dulce',
  },
  {
    key: 'corvina',
    label: 'Corvina',
    image: require('../../assets/species/corvina.png'),
    habitat: 'Playas, costa arenosa, estuarios y sectores costeros.',
    description:
      'Especie marina deportiva muy conocida en Chile, buscada principalmente desde orilla y embarcación.',
    environment: 'Mar / costa',
  },
  {
    key: 'merlusa',
    label: 'Merluza',
    image: require('../../assets/species/merlusa.png'),
    habitat: 'Ambientes marinos, principalmente fondos y plataforma continental.',
    description:
      'Pez marino de amplia presencia en Chile. Su disponibilidad y regulación dependen de la zona y especie específica.',
    environment: 'Mar / costa',
  },
];


export function HomeScreen({
  token,
  onOpenConditions,
  onOpenCredentials,
  onOpenDeals,
  onOpenMap,
  onOpenCapture,
  onOpenWall,
}: HomeScreenProps) {
  const heroVideoPlayer = useVideoPlayer(HERO_VIDEO);

  useEffect(() => {
    heroVideoPlayer.loop = true;
    heroVideoPlayer.muted = true;
    heroVideoPlayer.play();

    return () => {
      heroVideoPlayer.pause();
    };
  }, [heroVideoPlayer]);

  const [items, setItems] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const [affiliateRecommendations, setAffiliateRecommendations] =
    useState<AffiliateRecommendation[]>([]);
  const [affiliateLoading, setAffiliateLoading] = useState(true);

  const [credentials, setCredentials] =
    useState<CredentialRecord[]>([]);
  const [credentialsLoading, setCredentialsLoading] =
    useState(true);

  const [outdoorContext, setOutdoorContext] =
    useState<OutdoorContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState('');

  const [heroWeather, setHeroWeather] =
    useState<{
      temperature: number | null;
      wind: number | null;
    }>({
      temperature: null,
      wind: null,
    });
  const [heroActivity, setHeroActivity] =
    useState<number | null>(null);

  const [selectedSpeciesInfo, setSelectedSpeciesInfo] =
    useState<SpeciesInfo | null>(null);

  const [shareTarget, setShareTarget] = useState<ShareTarget>({
    title: 'Pesca & Outdoor',
    text: 'Mira esta aventura en Pesca & Outdoor.',
    url: `${PUBLIC_WEB_URL}/trofeo/demo`,
  });

  useEffect(() => {
    getTrophies(token)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    getAffiliateRecommendations()
      .then(setAffiliateRecommendations)
      .catch(() => setAffiliateRecommendations([]))
      .finally(() => setAffiliateLoading(false));
  }, []);

  useEffect(() => {
    getCredentials(token)
      .then(setCredentials)
      .catch(() => setCredentials([]))
      .finally(() => setCredentialsLoading(false));
  }, [token]);

  useEffect(() => {
    void loadOutdoorContext(false);
  }, []);

  async function loadOutdoorContext(
    requestPermission: boolean,
  ) {
    setContextLoading(true);
    setContextMessage('');

    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setOutdoorContext(null);
        setContextMessage(
          'Activa tu ubicación para mostrar temporadas y normativa de tu zona.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const contextResult =
        await getOutdoorContext(
          position.coords.latitude,
          position.coords.longitude,
        );

      setOutdoorContext(contextResult);

      const [weatherResult, solunarResult] =
        await Promise.allSettled([
          getWeather(
            position.coords.latitude,
            position.coords.longitude,
          ),
          getSolunar(),
        ]);

      if (weatherResult.status === 'fulfilled') {
        const weatherPayload =
          weatherResult.value as {
            current?: {
              temperature_2m?: number;
              wind_speed_10m?: number;
            };
          };

        setHeroWeather({
          temperature:
            weatherPayload.current?.temperature_2m ??
            null,
          wind:
            weatherPayload.current?.wind_speed_10m ??
            null,
        });
      }

      if (solunarResult.status === 'fulfilled') {
        const solunarPayload =
          solunarResult.value as {
            activity_index?: number;
          };

        setHeroActivity(
          typeof solunarPayload.activity_index ===
            'number'
            ? solunarPayload.activity_index
            : null,
        );
      }
    } catch (err) {
      setContextMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener la normativa de tu zona.',
      );
    } finally {
      setContextLoading(false);
    }
  }

  function openDemoShare() {
    setShareTarget({
      title: 'Trucha arcoíris · 54 cm',
      text:
        'Mira esta captura compartida en Pesca & Outdoor. Ubicación protegida.',
      url: `${PUBLIC_WEB_URL}/trofeo/demo`,
    });
    setShareVisible(true);
  }

  function openTrophyShare(item: Trophy) {
    setShareTarget({
      title: `${item.species_name} · ${item.title}`,
      text:
        item.description ??
        'Mira esta aventura compartida en Pesca & Outdoor.',
      url: `${PUBLIC_WEB_URL}/trofeo/${item.id}`,
    });
    setShareVisible(true);
  }

  return (
    <>
      <AnimatedBackground intensity="soft">
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>PESCA & OUTDOOR</Text>

              <Text style={styles.title}>
                Tu próxima aventura comienza aquí
              </Text>

              <Text style={styles.subtitle}>
                Comunidad, equipos, clima y experiencias outdoor.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.notificationButton,
                pressed && styles.notificationButtonPressed,
              ]}
              onPress={() => setNotificationsVisible(true)}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <VideoView
              player={heroVideoPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />

            <LinearGradient
              colors={[
                'rgba(7,28,20,0.05)',
                'rgba(7,28,20,0.90)',
              ]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Ionicons
                    name="cloud-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.heroBadgeText}>
                    Condiciones de hoy
                  </Text>
                </View>

                <View style={styles.heroLocationCard}>
                  <View style={styles.heroLocationIcon}>
                    <Ionicons
                      name="location"
                      size={18}
                      color="#39B5FF"
                    />
                  </View>

                  <View style={styles.heroLocationContent}>
                    <Text style={styles.heroLocationEyebrow}>
                      TU UBICACIÓN
                    </Text>
                    <Text
                      style={styles.heroLocationText}
                      numberOfLines={2}
                    >
                      {outdoorContext?.location.label ??
                        'Activa la ubicación para ver tu zona'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                {heroActivity !== null
                  ? heroActivity >= 75
                    ? 'Condiciones muy favorables'
                    : heroActivity >= 60
                      ? 'Buen momento para salir'
                      : heroActivity >= 45
                        ? 'Condiciones moderadas'
                        : 'Revisa bien las condiciones'
                  : 'Revisa las condiciones de hoy'}
              </Text>

              <Text style={styles.heroDescription}>
                Revisa las condiciones antes de preparar tu equipo.
              </Text>

              <View style={styles.statsRow}>
                <Stat
                  icon="thermometer-outline"
                  value={
                    heroWeather.temperature !== null
                      ? `${Math.round(heroWeather.temperature * 10) / 10}°C`
                      : '—'
                  }
                  label="Temperatura"
                />
                <Stat
                  icon="navigate-outline"
                  value={
                    heroWeather.wind !== null
                      ? `${Math.round(heroWeather.wind * 10) / 10} km/h`
                      : '—'
                  }
                  label="Viento"
                />
                <Stat
                  icon="moon-outline"
                  value={
                    heroActivity !== null
                      ? `${heroActivity}/100`
                      : '—'
                  }
                  label="Actividad"
                />
              </View>

              <AnimatedButton
                title="Ver condiciones"
                icon="arrow-forward"
                onPress={onOpenConditions}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Accesos rápidos</Text>
              <Text style={styles.sectionSubtitle}>
                Todo lo que necesitas para tu salida
              </Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            <QuickCard
              icon="map-outline"
              title="Mapa"
              description="Explora nuevas zonas"
              onPress={onOpenMap}
            />

            <QuickCard
              icon="cloud-outline"
              title="Clima"
              description="Revisa el pronóstico"
              onPress={onOpenConditions}
            />

            <QuickCard
              icon="fish-outline"
              title="Captura"
              description="Registra un trofeo"
              onPress={onOpenCapture}
            />

            <QuickCard
              icon="pricetag-outline"
              title="Comprar"
              description="Productos y enlaces recomendados"
              onPress={onOpenDeals}
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Especies y temporadas en tu zona
              </Text>
              <Text style={styles.sectionSubtitle}>
                {outdoorContext
                  ? `Cerca de ${outdoorContext.location.label}`
                  : 'Pesca, caza y normativa oficial'}
              </Text>
            </View>

            {outdoorContext ? (
              <Pressable
                style={styles.smallRefreshButton}
                onPress={() => void loadOutdoorContext(false)}
              >
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color="#64C8F5"
                />
              </Pressable>
            ) : null}
          </View>

          <SeasonPanel
            context={outdoorContext}
            loading={contextLoading}
            message={contextMessage}
            onEnableLocation={() =>
              void loadOutdoorContext(true)
            }
            onOpenInfo={setSelectedSpeciesInfo}
          />

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Mis credenciales
              </Text>
              <Text style={styles.sectionSubtitle}>
                Licencias y permisos guardados en tu cuenta
              </Text>
            </View>

            <Pressable onPress={onOpenCredentials}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </Pressable>
          </View>

          <CredentialHomeCard
            credential={credentials[0] ?? null}
            loading={credentialsLoading}
            onPress={onOpenCredentials}
          />

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Productos recomendados</Text>
              <Text style={styles.sectionSubtitle}>
                Compara y compra desde tiendas externas
              </Text>
            </View>

            <Pressable onPress={onOpenDeals}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </Pressable>
          </View>

          {affiliateLoading ? (
            <View style={styles.affiliateLoadingCard}>
              <ActivityIndicator size="small" color="#39B5FF" />
              <Text style={styles.affiliateLoadingText}>
                Buscando recomendaciones...
              </Text>
            </View>
          ) : affiliateRecommendations.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.affiliateRow}
            >
              {affiliateRecommendations.map((product) => (
                <AffiliateRecommendationCard
                  key={`${product.platform}-${product.item_id}`}
                  product={product}
                />
              ))}
            </ScrollView>
          ) : (
            <Pressable style={styles.dealCard} onPress={onOpenDeals}>
              <View style={styles.dealPlaceholder}>
                <Ionicons
                  name="bag-handle-outline"
                  size={44}
                  color="#64C8F5"
                />
              </View>

              <View style={styles.dealContent}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>PRÓXIMAMENTE</Text>
                </View>

                <Text style={styles.dealBrand}>RECOMENDADOS</Text>
                <Text style={styles.dealName}>
                  Productos desde tiendas externas
                </Text>

                <Text style={styles.dealNote}>
                  Al conectar la cuenta de afiliado, PiqueAPP mostrará imágenes y datos remotos sin guardar las fotos.
                </Text>
              </View>
            </Pressable>
          )}

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Aventuras recientes</Text>
              <Text style={styles.sectionSubtitle}>
                Capturas compartidas por la comunidad
              </Text>
            </View>

            <Pressable onPress={onOpenWall}>
              <Text style={styles.seeAll}>Ver muro</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#39B5FF"
              style={styles.loading}
            />
          ) : null}

          {!loading && items.length === 0 ? (
            <DemoTrophyCard onShare={openDemoShare} />
          ) : null}

          {items.map((item) => (
            <View
              style={styles.trophyCard}
              key={item.id}
            >
              <HomeTrophyImage
                token={token}
                trophyId={item.id}
              />

              <View style={styles.trophyContent}>
                <Text style={styles.species}>{item.species_name}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>

                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="#66716B"
                  />
                  <Text style={styles.location}>
                    {item.public_region ?? 'Zona protegida'}
                  </Text>
                </View>

                {item.description ? (
                  <Text style={styles.description}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.socialRow}>
                  <Pressable
                    style={styles.socialItem}
                    onPress={onOpenWall}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={20}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>Me gusta</Text>
                  </Pressable>

                  <Pressable
                    style={styles.socialItem}
                    onPress={onOpenWall}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={19}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>Comentar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.socialItem}
                    onPress={() => openTrophyShare(item)}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>Compartir</Text>
                  </Pressable>

                  <Ionicons
                    name="bookmark-outline"
                    size={20}
                    color="#526159"
                    style={styles.bookmark}
                  />
                </View>
              </View>
            </View>
          ))}

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
      </AnimatedBackground>


      <Modal
        visible={selectedSpeciesInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSpeciesInfo(null)}
      >
        <Pressable
          style={styles.speciesModalBackdrop}
          onPress={() => setSelectedSpeciesInfo(null)}
        >
          <Pressable
            style={styles.speciesModalCard}
            onPress={(event) => event.stopPropagation()}
          >
            {selectedSpeciesInfo ? (
              <>
                <View style={styles.speciesModalImageWrap}>
                  <Image
                    source={selectedSpeciesInfo.image}
                    style={styles.speciesModalImage}
                    contentFit="contain"
                    transition={250}
                  />
                  <View style={styles.speciesModalEnvironment}>
                    <Text style={styles.speciesModalEnvironmentText}>
                      {selectedSpeciesInfo.environment}
                    </Text>
                  </View>
                </View>

                <View style={styles.speciesModalBody}>
                  <View style={styles.speciesModalHeader}>
                    <View style={styles.speciesModalHeaderText}>
                      <Text style={styles.speciesModalEyebrow}>
                        FICHA DE ESPECIE
                      </Text>
                      <Text style={styles.speciesModalTitle}>
                        {selectedSpeciesInfo.label}
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.speciesModalClose,
                        pressed && styles.sourceLinkPressed,
                      ]}
                      onPress={() => setSelectedSpeciesInfo(null)}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color="#EAF7FC"
                      />
                    </Pressable>
                  </View>

                  <View style={styles.speciesModalInfoRow}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#39B5FF"
                    />
                    <View style={styles.speciesModalInfoContent}>
                      <Text style={styles.speciesModalInfoLabel}>
                        Hábitat habitual
                      </Text>
                      <Text style={styles.speciesModalInfoText}>
                        {selectedSpeciesInfo.habitat}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.speciesModalDescription}>
                    {selectedSpeciesInfo.description}
                  </Text>

                  <View style={styles.speciesModalNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#F0B34C"
                    />
                    <Text style={styles.speciesModalNoticeText}>
                      Esta ficha identifica la especie. La temporada, límites,
                      vedas y normativa se consultan por separado según la zona.
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>


      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <Pressable
          style={styles.notificationModalBackdrop}
          onPress={() => setNotificationsVisible(false)}
        >
          <Pressable
            style={styles.notificationModalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.notificationModalHeader}>
              <View>
                <Text style={styles.notificationModalEyebrow}>
                  CENTRO DE AVISOS
                </Text>
                <Text style={styles.notificationModalTitle}>
                  Notificaciones
                </Text>
                <Text style={styles.notificationModalSubtitle}>
                  Resumen local del MVP
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.notificationModalClose,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setNotificationsVisible(false)}
              >
                <Ionicons name="close" size={22} color="#EAF7FC" />
              </Pressable>
            </View>

            <NotificationItem
              icon="partly-sunny-outline"
              title="Condiciones actualizadas"
              text={
                heroActivity !== null
                  ? `Actividad estimada ${heroActivity}/100. Revisa viento, temperatura y pronóstico antes de salir.`
                  : 'Revisa las condiciones de hoy antes de preparar tu equipo.'
              }
            />

            <NotificationItem
              icon="fish-outline"
              title="Especies y temporadas"
              text={
                outdoorContext
                  ? `Hay información regional disponible para ${outdoorContext.location.label}.`
                  : 'Activa la ubicación para recibir información de temporadas de tu zona.'
              }
            />

            <NotificationItem
              icon="card-outline"
              title="Licencia y documentos"
              text={
                credentials[0]?.expires_at
                  ? `Tu licencia registrada vence el ${formatHomeDate(credentials[0].expires_at)}.`
                  : 'Guarda tu licencia para tener sus datos disponibles en tu cuenta.'
              }
            />

            <View style={styles.notificationMvpNote}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#F0B34C"
              />
              <Text style={styles.notificationMvpNoteText}>
                En esta etapa las alertas se generan dentro de la app. Las
                notificaciones push llegarán en una fase posterior del piloto.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ShareMenu
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title={shareTarget.title}
        text={shareTarget.text}
        url={shareTarget.url}
      />
    </>
  );
}


function NotificationItem({
  icon,
  title,
  text,
}: {
  icon: IconName;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.notificationItem}>
      <View style={styles.notificationItemIcon}>
        <Ionicons name={icon} size={20} color="#39B5FF" />
      </View>

      <View style={styles.notificationItemContent}>
        <Text style={styles.notificationItemTitle}>{title}</Text>
        <Text style={styles.notificationItemText}>{text}</Text>
      </View>
    </View>
  );
}


function HomeTrophyImage({
  token,
  trophyId,
}: {
  token: string;
  trophyId: string;
}) {
  const [uri, setUri] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    getTrophyImageDataUrl(
      token,
      trophyId,
    )
      .then((result) => {
        if (active) {
          setUri(result);
        }
      })
      .catch(() => {
        if (active) {
          setUri(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, trophyId]);

  if (loading) {
    return (
      <View style={styles.realTrophyImage}>
        <ActivityIndicator
          color="#39B5FF"
        />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.realTrophyImage}>
        <Ionicons
          name="image-outline"
          size={38}
          color="#779083"
        />
        <Text style={styles.imagePlaceholderText}>
          Sin fotografía
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.realTrophyImage}
      contentFit="cover"
      transition={250}
    />
  );
}



function MotionPressable({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  style: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  function animate(toScale: number, toLift: number) {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: true,
        speed: 28,
        bounciness: 7,
      }),
      Animated.spring(lift, {
        toValue: toLift,
        useNativeDriver: true,
        speed: 28,
        bounciness: 7,
      }),
    ]).start();
  }

  return (
    <Animated.View
      style={{
        transform: [
          { scale },
          { translateY: lift },
        ],
      }}
    >
      <Pressable
        style={style}
        onPress={onPress}
        onPressIn={() => animate(0.975, 2)}
        onPressOut={() => animate(1, 0)}
        onHoverIn={() => animate(1.015, -3)}
        onHoverOut={() => animate(1, 0)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}


function CredentialHomeCard({
  credential,
  loading,
  onPress,
}: {
  credential: CredentialRecord | null;
  loading: boolean;
  onPress: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.credentialHomeCard}>
        <ActivityIndicator color="#39B5FF" />
        <Text style={styles.credentialHomeMuted}>
          Revisando credenciales…
        </Text>
      </View>
    );
  }

  if (!credential) {
    return (
      <MotionPressable
        style={styles.credentialHomeCard}
        onPress={onPress}
      >
        <View style={styles.credentialHomeIllustration}>
          <Text style={styles.credentialFishingEmoji}>🎣</Text>
        </View>

        <View style={styles.credentialHomeContent}>
          <Text style={styles.credentialHomeEyebrow}>
            DOCUMENTOS DE PESCA
          </Text>
          <Text style={styles.credentialHomeTitle}>
            Guarda tu licencia de pesca
          </Text>
          <Text style={styles.credentialHomeMuted}>
            Ten tu permiso, número y vencimiento siempre disponibles.
          </Text>
        </View>

        <View style={styles.credentialHomeAction}>
          <Text style={styles.credentialHomeActionText}>
            Agregar
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#031A22"
          />
        </View>
      </MotionPressable>
    );
  }

  const status = getHomeCredentialStatus(
    credential.expires_at,
  );

  return (
    <MotionPressable
      style={styles.credentialHomeCard}
      onPress={onPress}
    >
      <View style={styles.credentialHomeIllustration}>
        <Text style={styles.credentialFishingEmoji}>🎣</Text>
      </View>

      <View style={styles.credentialHomeContent}>
        <Text style={styles.credentialHomeEyebrow}>
          LICENCIA DE PESCA
        </Text>
        <Text style={styles.credentialHomeTitle}>
          {credential.title}
        </Text>

        <Text style={styles.credentialHomeMuted}>
          {credential.expires_at
            ? `Vence: ${formatHomeDate(credential.expires_at)}`
            : credential.authority}
        </Text>
      </View>

      <View
        style={[
          styles.credentialHomeBadge,
          {
            backgroundColor:
              status.background,
          },
        ]}
      >
        <Text
          style={[
            styles.credentialHomeBadgeText,
            {
              color:
                status.color,
            },
          ]}
        >
          {status.label}
        </Text>
      </View>
    </MotionPressable>
  );
}

function getHomeCredentialStatus(
  expiresAt: string | null,
) {
  if (!expiresAt) {
    return {
      label: 'Sin fecha',
      color: '#6C6654',
      background: '#EEEBDD',
    };
  }

  const expires =
    new Date(`${expiresAt}T23:59:59`);

  if (expires.getTime() < Date.now()) {
    return {
      label: 'Vencida',
      color: '#A34D3E',
      background: '#F7E5E1',
    };
  }

  return {
    label: 'Vigente',
    color: '#237447',
    background: '#DDF0E3',
  };
}

function formatHomeDate(
  value: string,
) {
  const [year, month, day] =
    value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}-${month}-${year}`;
}



function buildRegionalSeasonList(context: OutdoorContext): SeasonSummary[] {
  const base = [...context.seasons];
  const location = normalizeSpeciesName(context.location.label ?? '');

  // MVP regional: agregamos especies habituales de La Araucanía como fichas
  // informativas. No inventamos apertura/cierre: quedan como "Revisar normativa".
  if (location.includes('araucania') || location.includes('cholchol')) {
    const regional: SeasonSummary[] = [
      {
        category: 'pesca',
        species: 'Trucha arcoíris',
        scientific_name: null,
        source_title: 'SERNAPESCA — información de pesca recreativa',
        status: 'regulated',
        status_label: 'Revisar normativa vigente',
        period: 'Especie habitual de ríos y lagos de la zona',
        summary:
          'Salmonídeo frecuente en aguas frías y oxigenadas. La apertura, límites y modalidades dependen del cuerpo de agua y la temporada vigente.',
        source_url: 'https://www.sernapesca.cl/',
        authority: 'SERNAPESCA',
      },
      {
        category: 'pesca',
        species: 'Trucha fario',
        scientific_name: null,
        source_title: 'SERNAPESCA — información de pesca recreativa',
        status: 'regulated',
        status_label: 'Revisar normativa vigente',
        period: 'Especie habitual de ríos y lagos de la zona',
        summary:
          'También conocida como trucha café. Suele encontrarse en sectores con corriente, pozones, sombra y estructura.',
        source_url: 'https://www.sernapesca.cl/',
        authority: 'SERNAPESCA',
      },
      {
        category: 'pesca',
        species: 'Pejerrey',
        scientific_name: null,
        source_title: 'SERNAPESCA — información de pesca recreativa',
        status: 'regulated',
        status_label: 'Revisar normativa vigente',
        period: 'Presencia según cuerpo de agua',
        summary:
          'Pez de aguas interiores y ambientes estuarinos según especie. Conviene verificar la regulación específica del lugar.',
        source_url: 'https://www.sernapesca.cl/',
        authority: 'SERNAPESCA',
      },
      {
        category: 'pesca',
        species: 'Carpa',
        scientific_name: null,
        source_title: 'SERNAPESCA — información de pesca recreativa',
        status: 'regulated',
        status_label: 'Revisar normativa vigente',
        period: 'Presencia en lagunas, embalses y aguas lentas',
        summary:
          'Especie resistente asociada a aguas más tranquilas. La app la muestra como especie potencial de la macrozona y no como garantía de presencia en un punto específico.',
        source_url: 'https://www.sernapesca.cl/',
        authority: 'SERNAPESCA',
      },
      {
        category: 'pesca',
        species: 'Bagre',
        scientific_name: null,
        source_title: 'SERNAPESCA — información de pesca recreativa',
        status: 'regulated',
        status_label: 'Revisar normativa vigente',
        period: 'Presencia local variable',
        summary:
          'Registro referencial para aguas continentales. La presencia exacta debe confirmarse por cuenca y normativa local.',
        source_url: 'https://www.sernapesca.cl/',
        authority: 'SERNAPESCA',
      },
    ];

    for (const candidate of regional) {
      const candidateName = normalizeSpeciesName(candidate.species);
      const alreadyExists = base.some((item) => {
        const existing = normalizeSpeciesName(item.species);
        return (
          existing === candidateName ||
          existing.includes(candidateName) ||
          candidateName.includes(existing)
        );
      });

      if (!alreadyExists) {
        base.push(candidate);
      }
    }
  }

  return base;
}


function SeasonPanel({
  context,
  loading,
  message,
  onEnableLocation,
  onOpenInfo,
}: {
  context: OutdoorContext | null;
  loading: boolean;
  message: string;
  onEnableLocation: () => void;
  onOpenInfo: (info: SpeciesInfo) => void;
}) {
  if (loading) {
    return (
      <View style={styles.seasonStateCard}>
        <ActivityIndicator color="#39B5FF" />
        <Text style={styles.seasonStateText}>
          Revisando ubicación y temporadas…
        </Text>
      </View>
    );
  }

  if (!context) {
    return (
      <View style={styles.seasonStateCard}>
        <View style={styles.seasonStateIcon}>
          <Ionicons
            name="location-outline"
            size={24}
            color="#64C8F5"
          />
        </View>

        <View style={styles.seasonStateContent}>
          <Text style={styles.seasonStateTitle}>
            Información local disponible
          </Text>
          <Text style={styles.seasonStateText}>
            {message ||
              'Usa tu ubicación aproximada para mostrar temporadas y normativa aplicable a tu zona.'}
          </Text>
        </View>

        <Pressable
          style={styles.locationButton}
          onPress={onEnableLocation}
        >
          <Text style={styles.locationButtonText}>
            Usar mi ubicación
          </Text>
        </Pressable>
      </View>
    );
  }

  const visibleSeasons = buildRegionalSeasonList(context);

  return (
    <View style={styles.seasonCard}>
      {visibleSeasons.map((item, index) => (
        <SeasonRow
          key={`${item.category}-${item.species}`}
          item={item}
          last={index === visibleSeasons.length - 1}
          onOpenInfo={onOpenInfo}
        />
      ))}

      <View style={styles.seasonFooter}>
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color="#567164"
        />
        <Text style={styles.seasonFooterText}>
          Fuentes SERNAPESCA / SAG · ubicación {context.location.provider} ·
          verificado {context.checked_at}
        </Text>
      </View>

      <Text style={styles.seasonNotice}>
        {context.notice}
      </Text>
    </View>
  );
}

function SeasonRow({
  item,
  last,
  onOpenInfo,
}: {
  item: SeasonSummary;
  last: boolean;
  onOpenInfo: (info: SpeciesInfo) => void;
}) {
  const visual = getSeasonVisual(item.status);
  const speciesVisual = getSpeciesVisual(item.species, item.category);

  return (
    <View
      style={[
        styles.seasonRow,
        last && styles.seasonRowLast,
      ]}
    >
      {speciesVisual.image ? (
        <Pressable
          style={({ pressed }) => [
            styles.speciesVisual,
            pressed && styles.speciesVisualPressed,
          ]}
          onPress={() => onOpenInfo(speciesVisual.info)}
        >
          <Image
            source={speciesVisual.image}
            style={styles.speciesPhoto}
            contentFit="contain"
            transition={250}
          />
          <View style={styles.speciesImageShade} />
          <View style={styles.speciesImageLabel}>
            <Text style={styles.speciesKind}>
              {speciesVisual.label}
            </Text>
            <Text style={styles.speciesTapHint}>VER</Text>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color="#9BDDF8"
            />
          </View>
        </Pressable>
      ) : (
        <View style={styles.speciesVisual}>
          <View style={styles.speciesVisualGlow} />
          <Text style={styles.speciesEmoji}>
            {speciesVisual.emoji}
          </Text>
          <Text style={styles.speciesKind}>
            {speciesVisual.label}
          </Text>
        </View>
      )}

      <View style={styles.seasonRowContent}>
        <Text style={styles.seasonSpecies}>
          {item.species}
        </Text>

        <Text style={styles.seasonPeriod}>
          {item.period}
        </Text>

        <Text
          style={styles.seasonSummary}
          numberOfLines={3}
        >
          {item.summary}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.sourceLink,
            pressed && styles.sourceLinkPressed,
          ]}
          onPress={() => {
            void Linking.openURL(item.source_url);
          }}
        >
          <Text style={styles.sourceLinkText}>
            Ver normativa · {item.authority}
          </Text>
          <Ionicons
            name="open-outline"
            size={15}
            color="#F0B34C"
          />
        </Pressable>
      </View>

      <View
        style={[
          styles.seasonStatusPanel,
          {
            backgroundColor: visual.background,
            borderColor: visual.color,
          },
        ]}
      >
        <Ionicons
          name={visual.icon}
          size={30}
          color={visual.color}
        />
        <Text
          style={[
            styles.seasonStatusKicker,
            { color: visual.color },
          ]}
        >
          ESTADO
        </Text>
        <Text
          style={[
            styles.seasonStatusLabel,
            { color: visual.color },
          ]}
        >
          {item.status_label}
        </Text>
      </View>
    </View>
  );
}


function normalizeSpeciesName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getSpeciesVisual(
  species: string,
  category: string,
): {
  emoji: string;
  label: string;
  image: number | null;
  info: SpeciesInfo;
} {
  const value = normalizeSpeciesName(`${species} ${category}`);

  let match: SpeciesInfo | undefined;

  if (
    value.includes('chinook') ||
    value.includes('salmon rey')
  ) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'salmon-chinook');
  } else if (
    value.includes('arcoiris') ||
    value.includes('salmonido')
  ) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'trucha-arcoiris');
  } else if (
    value.includes('fario') ||
    value.includes('trucha cafe')
  ) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'trucha-fario');
  } else if (
    value.includes('trucha negra') ||
    value.includes('perca')
  ) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'perca');
  } else if (value.includes('carpa')) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'carpa');
  } else if (value.includes('pejerrey')) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'pejerrey');
  } else if (value.includes('corvina')) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'corvina');
  } else if (
    value.includes('merluza') ||
    value.includes('merlusa')
  ) {
    match = SPECIES_LIBRARY.find((item) => item.key === 'merlusa');
  }

  if (match) {
    return {
      emoji: '🐟',
      label: match.environment === 'Mar / costa' ? 'MAR' : 'PESCA',
      image: match.image,
      info: match,
    };
  }

  if (value.includes('bagre')) {
    return {
      emoji: '🐟',
      label: 'PESCA',
      image: null,
      info: {
        key: 'bagre',
        label: 'Bagre',
        image: SPECIES_LIBRARY[0].image,
        habitat: 'Aguas continentales; presencia variable según cuenca.',
        description:
          'Ficha referencial. Podemos agregar una imagen real del bagre chileno cuando la tengas disponible.',
        environment: 'Agua dulce',
      },
    };
  }

  if (
    value.includes('conejo') ||
    value.includes('liebre')
  ) {
    return {
      emoji: '🐇',
      label: 'CAZA',
      image: null,
      info: {
        key: 'conejo-liebre',
        label: 'Conejo / liebre',
        image: SPECIES_LIBRARY[0].image,
        habitat: 'Sectores rurales, praderas y matorrales.',
        description:
          'Especies cinegéticas sujetas a normativa SAG. Más adelante podemos agregar su fotografía real.',
        environment: 'Agua dulce',
      },
    };
  }

  if (
    value.includes('pato') ||
    value.includes('ave')
  ) {
    return {
      emoji: '🦆',
      label: 'CAZA',
      image: null,
      info: {
        key: 'pato',
        label: 'Patos autorizados',
        image: SPECIES_LIBRARY[0].image,
        habitat: 'Humedales, lagunas, vegas y riberas.',
        description:
          'Las especies autorizadas y sus temporadas dependen de la normativa SAG vigente.',
        environment: 'Agua dulce',
      },
    };
  }

  const fallback = SPECIES_LIBRARY[0];

  return {
    emoji: category.toLowerCase().includes('pesca') ? '🎣' : '🌲',
    label: category.toUpperCase(),
    image: null,
    info: fallback,
  };
}

function getSeasonVisual(
  status: SeasonSummary['status'],
): {
  icon: IconName;
  color: string;
  background: string;
} {
  switch (status) {
    case 'open':
      return {
        icon: 'checkmark-circle-outline',
        color: '#237447',
        background: '#DDF0E3',
      };

    case 'closed':
      return {
        icon: 'close-circle-outline',
        color: '#A34D3E',
        background: '#F7E5E1',
      };

    case 'protected':
      return {
        icon: 'shield-outline',
        color: '#315D78',
        background: '#E1EDF4',
      };

    case 'regulated':
      return {
        icon: 'alert-circle-outline',
        color: '#9A632F',
        background: '#F5E9D9',
      };

    default:
      return {
        icon: 'information-circle-outline',
        color: '#6C6654',
        background: '#EEEBDD',
      };
  }
}


function AffiliateRecommendationCard({
  product,
}: {
  product: AffiliateRecommendation;
}) {
  async function openAffiliateLink() {
    if (!product.affiliate_url) {
      return;
    }

    const supported = await Linking.canOpenURL(product.affiliate_url);
    if (supported) {
      await Linking.openURL(product.affiliate_url);
    }
  }

  const priceText =
    product.price !== null && product.currency
      ? new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: product.currency,
          maximumFractionDigits: 0,
        }).format(product.price)
      : 'Ver precio';

  return (
    <Pressable
      style={styles.affiliateCard}
      onPress={() => void openAffiliateLink()}
    >
      <View style={styles.affiliateImageWrap}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.affiliateImage}
            contentFit="contain"
            transition={250}
          />
        ) : (
          <View style={styles.affiliateImageFallback}>
            <Ionicons
              name="image-outline"
              size={32}
              color="#6D7B74"
            />
          </View>
        )}

        <View style={styles.affiliateBadge}>
          <Text style={styles.affiliateBadgeText}>AFILIADO</Text>
        </View>
      </View>

      <View style={styles.affiliateCardBody}>
        <Text style={styles.affiliatePlatform}>
          {product.platform_label}
        </Text>

        <Text
          style={styles.affiliateTitle}
          numberOfLines={2}
        >
          {product.title}
        </Text>

        <Text style={styles.affiliatePrice}>
          {priceText}
        </Text>

        <View style={styles.affiliateButton}>
          <Text style={styles.affiliateButtonText}>
            Ver producto
          </Text>
          <Ionicons
            name="open-outline"
            size={16}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.affiliateDisclosure}>
          Enlace de afiliado
        </Text>
      </View>
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color="#39B5FF" />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function QuickCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  function animate(toScale: number, toLift: number) {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }),
      Animated.spring(lift, {
        toValue: toLift,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }),
    ]).start();
  }

  return (
    <Animated.View
      style={[
        styles.quickWrapper,
        {
          transform: [
            { scale },
            { translateY: lift },
          ],
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.quickCard,
          pressed && styles.quickCardPressed,
        ]}
        onPress={onPress}
        onPressIn={() => animate(0.965, 3)}
        onPressOut={() => animate(1, 0)}
        onHoverIn={() => animate(1.025, -6)}
        onHoverOut={() => animate(1, 0)}
      >
        <View style={styles.quickIcon}>
          <Ionicons
            name={icon}
            size={27}
            color="#39B5FF"
          />
        </View>

        <View style={styles.quickTextBlock}>
          <Text style={styles.quickTitle}>{title}</Text>
          <Text style={styles.quickDescription}>
            {description}
          </Text>
        </View>

        <View style={styles.quickArrow}>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#39B5FF"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function AnimatedButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        alignSelf: 'flex-start',
      }}
    >
      <Pressable
        style={styles.heroButton}
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
      >
        <Text style={styles.heroButtonText}>{title}</Text>
        <Ionicons
          name={icon}
          size={18}
          color="#031A22"
        />
      </Pressable>
    </Animated.View>
  );
}

function DemoTrophyCard({
  onShare,
}: {
  onShare: () => void;
}) {
  return (
    <Pressable style={styles.trophyCard}>
      <View style={styles.demoImageContainer}>
        <Image
          source={{ uri: TROPHY_DEMO }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={450}
        />

        <LinearGradient
          colors={[
            'transparent',
            'rgba(7,28,20,0.88)',
          ]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>
            EJEMPLO VISUAL
          </Text>
        </View>

        <View style={styles.demoOverlay}>
          <Text style={styles.demoSpecies}>
            Trucha arcoíris
          </Text>
          <Text style={styles.demoMeta}>
            54 cm · Captura y liberación
          </Text>
        </View>
      </View>

      <View style={styles.trophyContent}>
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color="#66716B"
          />
          <Text style={styles.location}>
            Ubicación protegida
          </Text>
        </View>

        <Text style={styles.description}>
          Esta tarjeta es solo una demostración de cómo se verán las
          publicaciones cuando tengamos fotografías reales.
        </Text>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialItem}>
            <Ionicons
              name="heart-outline"
              size={20}
              color="#526159"
            />
            <Text style={styles.socialText}>126</Text>
          </Pressable>

          <Pressable style={styles.socialItem}>
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color="#526159"
            />
            <Text style={styles.socialText}>18</Text>
          </Pressable>

          <Pressable
            style={styles.socialItem}
            onPress={onShare}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color="#526159"
            />
            <Text style={styles.socialText}>Compartir</Text>
          </Pressable>

          <View style={styles.gearTag}>
            <Text style={styles.gearTagText}>
              🎣 X-Rap 08
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  page: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  container: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#F0B34C',
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  title: {
    color: '#F3FAFF',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: '#9FB7C2',
    fontSize: 15,
    marginTop: 5,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#073B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.82,
  },
  notificationDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39B5FF',
    right: 10,
    top: 9,
  },
  notificationModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 10, 14, 0.76)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 78,
    paddingHorizontal: 22,
  },
  notificationModalCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 26,
    backgroundColor: '#06232E',
    borderWidth: 1,
    borderColor: 'rgba(100, 200, 245, 0.22)',
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.36,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  notificationModalEyebrow: {
    color: '#F0B34C', fontSize: 9, fontWeight: '900', letterSpacing: 1.4,
  },
  notificationModalTitle: {
    color: '#F3FAFF', fontSize: 25, fontWeight: '900', marginTop: 3,
  },
  notificationModalSubtitle: {
    color: '#8FAAB5', fontSize: 12, marginTop: 3,
  },
  notificationModalClose: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    paddingVertical: 13, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  notificationItemIcon: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(57,181,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  notificationItemContent: { flex: 1 },
  notificationItemTitle: {
    color: '#ECF8FC', fontSize: 14, fontWeight: '900',
  },
  notificationItemText: {
    color: '#9AB2BC', fontSize: 12, lineHeight: 18, marginTop: 3,
  },
  notificationMvpNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(240,179,76,0.08)', borderRadius: 14,
    padding: 12, marginTop: 5,
  },
  notificationMvpNoteText: {
    flex: 1, color: '#C7D4D9', fontSize: 10, lineHeight: 16,
  },
  hero: {
    minHeight: 330,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#031A22',
    marginBottom: 34,
  },
  heroContent: {
    padding: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  heroLocationCard: {
    maxWidth: 360,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(3, 26, 34, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(100, 200, 245, 0.28)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  heroLocationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 181, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLocationContent: {
    flex: 1,
  },
  heroLocationEyebrow: {
    color: '#8FB6C7',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  heroDescription: {
    color: '#D5E0DA',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 560,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  statLabel: {
    color: '#C8D3CD',
    fontSize: 10,
    marginTop: 1,
  },
  heroButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#39B5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroButtonText: {
    color: '#031A22',
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 15,
    marginTop: 34,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F3FAFF',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#8EA8B3',
    fontSize: 14,
    marginTop: 3,
  },
  seeAll: {
    color: '#F0B34C',
    fontWeight: '900',
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickWrapper: {
    flexGrow: 1,
    flexBasis: 200,
  },
  quickCard: {
    minHeight: 142,
    borderWidth: 1,
    borderColor: 'rgba(123, 207, 244, 0.18)',
    backgroundColor: 'rgba(6, 31, 41, 0.90)',
    borderRadius: 22,
    padding: 18,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 5,
  },
  quickCardPressed: {
    borderColor: 'rgba(57, 181, 255, 0.50)',
    backgroundColor: 'rgba(8, 43, 56, 0.96)',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(57, 181, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(57, 181, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },
  quickTextBlock: {
    paddingRight: 34,
  },
  quickArrow: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(57, 181, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: '#EDF8FC',
    fontWeight: '900',
    fontSize: 16,
  },
  quickDescription: {
    color: '#91AAB4',
    marginTop: 3,
    fontSize: 13,
  },
  smallRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 181, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonCard: {
    borderWidth: 1,
    borderColor: 'rgba(123, 207, 244, 0.12)',
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  seasonStateCard: {
    minHeight: 120,
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  seasonStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(57, 181, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonStateContent: {
    flex: 1,
  },
  seasonStateTitle: {
    color: '#EDF8FC',
    fontSize: 15,
    fontWeight: '900',
  },
  seasonStateText: {
    color: '#91AAB4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  locationButton: {
    backgroundColor: '#39B5FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationButtonText: {
    color: '#031A22',
    fontWeight: '900',
    fontSize: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  seasonRowLast: {
    borderBottomWidth: 0,
  },
  speciesVisual: {
    width: 112,
    minHeight: 122,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 181, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57, 181, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  speciesVisualPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  speciesPhoto: {
    width: '96%',
    height: 88,
    marginTop: 4,
  },
  speciesImageShade: {
    ...StyleSheet.absoluteFill,
    top: 70,
    backgroundColor: 'rgba(3, 26, 34, 0.26)',
  },
  speciesImageLabel: {
    minHeight: 30,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(3, 26, 34, 0.88)',
  },
  speciesVisualGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(57, 181, 255, 0.09)',
    top: 10,
  },
  speciesEmoji: {
    fontSize: 38,
  },
  speciesKind: {
    color: '#7FB7CF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  speciesTapHint: {
    color: '#EAF7FC',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  seasonRowContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 360,
    justifyContent: 'center',
    minWidth: 190,
  },
  seasonSpecies: {
    color: '#EDF8FC',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  seasonStatusPanel: {
    width: 160,
    minHeight: 116,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  seasonStatusKicker: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 8,
  },
  seasonStatusLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
  },
  seasonPeriod: {
    color: '#B1C7D0',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
  },
  seasonSummary: {
    color: '#91AAB4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sourceLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
  },
  sourceLinkPressed: {
    opacity: 0.65,
  },
  sourceLinkText: {
    color: '#F0B34C',
    fontSize: 11,
    fontWeight: '900',
  },
  seasonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  seasonFooterText: {
    color: '#91AAB4',
    fontSize: 10,
    textAlign: 'center',
  },
  seasonNotice: {
    color: '#7F99A5',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  speciesModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 10, 14, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  speciesModalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '88%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#06232E',
    borderWidth: 1,
    borderColor: 'rgba(100, 200, 245, 0.22)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 12,
  },
  speciesModalImageWrap: {
    height: 270,
    backgroundColor: '#DDE9E7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  speciesModalImage: {
    width: '94%',
    height: '90%',
  },
  speciesModalEnvironment: {
    position: 'absolute',
    left: 18,
    bottom: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(3, 26, 34, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  speciesModalEnvironmentText: {
    color: '#9BDDF8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  speciesModalBody: {
    padding: 22,
  },
  speciesModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  speciesModalHeaderText: {
    flex: 1,
  },
  speciesModalEyebrow: {
    color: '#F0B34C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  speciesModalTitle: {
    color: '#F3FAFF',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    marginTop: 4,
  },
  speciesModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speciesModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 22,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(57, 181, 255, 0.08)',
  },
  speciesModalInfoContent: {
    flex: 1,
  },
  speciesModalInfoLabel: {
    color: '#9BDDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  speciesModalInfoText: {
    color: '#E5F2F6',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  speciesModalDescription: {
    color: '#B4C9D1',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
  },
  speciesModalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: 'rgba(240, 179, 76, 0.09)',
    padding: 13,
  },
  speciesModalNoticeText: {
    flex: 1,
    color: '#C7D4D9',
    fontSize: 11,
    lineHeight: 17,
  },

  credentialHomeCard: {
    minHeight: 128,
    borderWidth: 1,
    borderColor: 'rgba(123, 207, 244, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: 'rgba(6, 31, 41, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },

  credentialHomeIllustration: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: 'rgba(57, 181, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(57, 181, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  credentialFishingEmoji: {
    fontSize: 40,
  },

  credentialHomeContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 300,
  },

  credentialHomeEyebrow: {
    color: '#F0B34C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  credentialHomeTitle: {
    color: '#EDF8FC',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },

  credentialHomeMuted: {
    color: '#91AAB4',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },

  credentialHomeAction: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: '#39B5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  credentialHomeActionText: {
    color: '#031A22',
    fontSize: 12,
    fontWeight: '900',
  },

  credentialHomeBadge: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  credentialHomeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  dealCard: {
    minHeight: 185,
    flexDirection: 'row',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
  },
  dealPlaceholder: {
    width: '38%',
    minHeight: 185,
    backgroundColor: '#DDE8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDEBDD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  discountText: {
    color: '#287045',
    fontWeight: '900',
    fontSize: 10,
  },
  dealBrand: {
    color: '#F0B34C',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  dealName: {
    color: '#17281F',
    fontWeight: '900',
    fontSize: 22,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 9,
  },
  currentPrice: {
    color: '#183E2D',
    fontWeight: '900',
    fontSize: 22,
  },
  oldPrice: {
    color: '#929A95',
    textDecorationLine: 'line-through',
  },
  dealNote: {
    color: '#718078',
    fontSize: 11,
    marginTop: 8,
  },
  trophyCard: {
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
  },
  demoImageContainer: {
    height: 330,
    backgroundColor: '#DAD7CD',
  },
  demoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#39B5FF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  demoBadgeText: {
    color: '#031A22',
    fontWeight: '900',
    fontSize: 10,
  },
  demoOverlay: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    right: 20,
  },
  demoSpecies: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  demoMeta: {
    color: '#D9E1DC',
    marginTop: 4,
  },
  realTrophyImage: {
    height: 180,
    backgroundColor: '#E4EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: '#718078',
    fontSize: 12,
  },
  trophyContent: {
    padding: 18,
  },
  species: {
    color: '#2F684B',
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17251E',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  location: {
    color: '#66716B',
  },
  description: {
    color: '#46534C',
    marginTop: 9,
    lineHeight: 21,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 17,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  socialText: {
    color: '#526159',
    fontWeight: '700',
  },
  bookmark: {
    marginLeft: 'auto',
  },
  gearTag: {
    marginLeft: 'auto',
    backgroundColor: '#EEF1EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gearTagText: {
    color: '#405248',
    fontWeight: '700',
    fontSize: 12,
  },
  loading: {
    marginVertical: 35,
  },
  bottomSpace: {
    height: 30,
  },

  affiliateLoadingCard: {
    minHeight: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
    borderWidth: 1,
    borderColor: '#E6EBE8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  affiliateLoadingText: {
    color: '#66716B',
    fontSize: 13,
    fontWeight: '600',
  },
  affiliateRow: {
    gap: 14,
    paddingRight: 4,
    paddingBottom: 6,
  },
  affiliateCard: {
    width: 210,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: 'rgba(6, 31, 41, 0.82)',
    borderWidth: 1,
    borderColor: '#E3E9E5',
  },
  affiliateImageWrap: {
    height: 150,
    backgroundColor: '#F5F7F6',
    position: 'relative',
  },
  affiliateImage: {
    width: '100%',
    height: '100%',
  },
  affiliateImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderRadius: 999,
    backgroundColor: '#39B5FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  affiliateBadgeText: {
    color: '#1B251F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  affiliateCardBody: {
    padding: 14,
  },
  affiliatePlatform: {
    color: '#66716B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  affiliateTitle: {
    color: '#18231E',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    minHeight: 40,
  },
  affiliatePrice: {
    color: '#64C8F5',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 10,
  },
  affiliateButton: {
    borderRadius: 12,
    backgroundColor: '#64C8F5',
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  affiliateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  affiliateDisclosure: {
    marginTop: 8,
    color: '#7B8680',
    fontSize: 10,
    textAlign: 'center',
  },
});
