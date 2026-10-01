import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { ShareMenu } from '../components/ShareMenu';
import {
  getCredentials,
  getOutdoorContext,
  getTrophies,
  type CredentialRecord,
  type OutdoorContext,
  type SeasonSummary,
} from '../services/api';
import type { Trophy } from '../types/api';

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
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85';

const TROPHY_DEMO =
  'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1400&q=85';

const PUBLIC_WEB_URL = 'https://pescaoutdoor.cl';

export function HomeScreen({
  token,
  onOpenConditions,
  onOpenCredentials,
  onOpenDeals,
}: HomeScreenProps) {
  const [items, setItems] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);

  const [credentials, setCredentials] =
    useState<CredentialRecord[]>([]);
  const [credentialsLoading, setCredentialsLoading] =
    useState(true);

  const [outdoorContext, setOutdoorContext] =
    useState<OutdoorContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState('');

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

      const result = await getOutdoorContext(
        position.coords.latitude,
        position.coords.longitude,
      );

      setOutdoorContext(result);
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

            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Image
              source={{ uri: HERO_IMAGE }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={450}
            />

            <LinearGradient
              colors={[
                'rgba(7,28,20,0.05)',
                'rgba(7,28,20,0.90)',
              ]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroContent}>
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

              <Text style={styles.heroTitle}>
                Buen momento para salir
              </Text>

              <Text style={styles.heroDescription}>
                Revisa las condiciones antes de preparar tu equipo.
              </Text>

              <View style={styles.statsRow}>
                <Stat
                  icon="thermometer-outline"
                  value="11°C"
                  label="Temperatura"
                />
                <Stat
                  icon="navigate-outline"
                  value="8 km/h"
                  label="Viento"
                />
                <Stat
                  icon="moon-outline"
                  value="82/100"
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
              onPress={() => {}}
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
              onPress={() => {}}
            />

            <QuickCard
              icon="pricetag-outline"
              title="Ofertas"
              description="Encuentra buenos precios"
              onPress={onOpenDeals}
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Temporadas en tu zona
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
                  color="#315D49"
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
              <Text style={styles.sectionTitle}>Ofertas destacadas</Text>
              <Text style={styles.sectionSubtitle}>
                Equipamiento que vale la pena mirar
              </Text>
            </View>

            <Pressable onPress={onOpenDeals}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </Pressable>
          </View>

          <Pressable style={styles.dealCard} onPress={onOpenDeals}>
            <View style={styles.dealPlaceholder}>
              <Ionicons
                name="fish-outline"
                size={48}
                color="#315D49"
              />
            </View>

            <View style={styles.dealContent}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>OFERTA DEMO</Text>
              </View>

              <Text style={styles.dealBrand}>SHIMANO</Text>
              <Text style={styles.dealName}>Sedona 2500</Text>

              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>$49.990</Text>
                <Text style={styles.oldPrice}>$69.990</Text>
              </View>

              <Text style={styles.dealNote}>
                Más adelante este precio vendrá desde la API.
              </Text>
            </View>
          </Pressable>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Aventuras recientes</Text>
              <Text style={styles.sectionSubtitle}>
                Capturas compartidas por la comunidad
              </Text>
            </View>

            <Pressable>
              <Text style={styles.seeAll}>Ver muro</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#D9A441"
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
              <View style={styles.realTrophyImage}>
                <Ionicons
                  name="image-outline"
                  size={38}
                  color="#779083"
                />
                <Text style={styles.imagePlaceholderText}>
                  Fotografía de la captura
                </Text>
              </View>

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
                  <Pressable style={styles.socialItem}>
                    <Ionicons
                      name="heart-outline"
                      size={20}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>Me gusta</Text>
                  </Pressable>

                  <Pressable style={styles.socialItem}>
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
        <ActivityIndicator color="#D9A441" />
        <Text style={styles.credentialHomeMuted}>
          Revisando credenciales…
        </Text>
      </View>
    );
  }

  if (!credential) {
    return (
      <Pressable
        style={styles.credentialHomeCard}
        onPress={onPress}
      >
        <View style={styles.credentialHomeIcon}>
          <Ionicons
            name="card-outline"
            size={25}
            color="#D9A441"
          />
        </View>

        <View style={styles.credentialHomeContent}>
          <Text style={styles.credentialHomeTitle}>
            Guarda tu licencia de pesca
          </Text>
          <Text style={styles.credentialHomeMuted}>
            Ten a mano su número y fecha de vencimiento.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={21}
          color="#66756D"
        />
      </Pressable>
    );
  }

  const status = getHomeCredentialStatus(
    credential.expires_at,
  );

  return (
    <Pressable
      style={styles.credentialHomeCard}
      onPress={onPress}
    >
      <View style={styles.credentialHomeIcon}>
        <Ionicons
          name="fish-outline"
          size={25}
          color="#D9A441"
        />
      </View>

      <View style={styles.credentialHomeContent}>
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
    </Pressable>
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


function SeasonPanel({
  context,
  loading,
  message,
  onEnableLocation,
}: {
  context: OutdoorContext | null;
  loading: boolean;
  message: string;
  onEnableLocation: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.seasonStateCard}>
        <ActivityIndicator color="#D9A441" />
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
            color="#315D49"
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

  return (
    <View style={styles.seasonCard}>
      {context.seasons.slice(0, 5).map((item, index) => (
        <SeasonRow
          key={`${item.category}-${item.species}`}
          item={item}
          last={index === Math.min(context.seasons.length, 5) - 1}
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
}: {
  item: SeasonSummary;
  last: boolean;
}) {
  const visual = getSeasonVisual(item.status);

  return (
    <View
      style={[
        styles.seasonRow,
        last && styles.seasonRowLast,
      ]}
    >
      <View
        style={[
          styles.seasonStatusIcon,
          { backgroundColor: visual.background },
        ]}
      >
        <Ionicons
          name={visual.icon}
          size={20}
          color={visual.color}
        />
      </View>

      <View style={styles.seasonRowContent}>
        <View style={styles.seasonRowTop}>
          <Text style={styles.seasonSpecies}>
            {item.species}
          </Text>

          <View
            style={[
              styles.seasonBadge,
              { backgroundColor: visual.background },
            ]}
          >
            <Text
              style={[
                styles.seasonBadgeText,
                { color: visual.color },
              ]}
            >
              {item.status_label}
            </Text>
          </View>
        </View>

        <Text style={styles.seasonPeriod}>
          {item.period}
        </Text>

        <Text
          style={styles.seasonSummary}
          numberOfLines={2}
        >
          {item.summary}
        </Text>

        <Pressable
          style={styles.sourceLink}
          onPress={() => {
            void Linking.openURL(item.source_url);
          }}
        >
          <Text style={styles.sourceLinkText}>
            Fuente: {item.authority}
          </Text>
          <Ionicons
            name="open-outline"
            size={14}
            color="#A3652E"
          />
        </Pressable>
      </View>
    </View>
  );
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
      <Ionicons name={icon} size={20} color="#D9A441" />
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

  return (
    <Animated.View
      style={[
        styles.quickWrapper,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        style={styles.quickCard}
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 30,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 25,
            bounciness: 8,
          }).start();
        }}
      >
        <View style={styles.quickIcon}>
          <Ionicons
            name={icon}
            size={25}
            color="#174A36"
          />
        </View>

        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickDescription}>
          {description}
        </Text>
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
          color="#10261C"
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
    backgroundColor: '#F4F0E5',
  },
  page: {
    flexGrow: 1,
    backgroundColor: '#F4F0E5',
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
    color: '#A3652E',
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  title: {
    color: '#14251C',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: '#68756D',
    fontSize: 15,
    marginTop: 5,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#123D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9A441',
    right: 10,
    top: 9,
  },
  hero: {
    minHeight: 330,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#10261C',
    marginBottom: 34,
  },
  heroContent: {
    padding: 28,
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
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
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
    backgroundColor: '#D9A441',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroButtonText: {
    color: '#10261C',
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
    color: '#16271E',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#728078',
    fontSize: 14,
    marginTop: 3,
  },
  seeAll: {
    color: '#A3652E',
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
    minHeight: 132,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E2ECE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },
  quickTitle: {
    color: '#17291F',
    fontWeight: '900',
    fontSize: 16,
  },
  quickDescription: {
    color: '#768078',
    marginTop: 3,
    fontSize: 13,
  },
  smallRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  seasonStateCard: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonStateContent: {
    flex: 1,
  },
  seasonStateTitle: {
    color: '#17291F',
    fontSize: 15,
    fontWeight: '900',
  },
  seasonStateText: {
    color: '#6D7A72',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  locationButton: {
    backgroundColor: '#D9A441',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationButtonText: {
    color: '#10261C',
    fontWeight: '900',
    fontSize: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFEA',
  },
  seasonRowLast: {
    borderBottomWidth: 0,
  },
  seasonStatusIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonRowContent: {
    flex: 1,
  },
  seasonRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  seasonSpecies: {
    flex: 1,
    color: '#17291F',
    fontSize: 15,
    fontWeight: '900',
  },
  seasonBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  seasonBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  seasonPeriod: {
    color: '#4E6257',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
  },
  seasonSummary: {
    color: '#748078',
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
  sourceLinkText: {
    color: '#A3652E',
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
    color: '#66756D',
    fontSize: 10,
    textAlign: 'center',
  },
  seasonNotice: {
    color: '#8A928D',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  credentialHomeCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },

  credentialHomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  credentialHomeContent: {
    flex: 1,
  },

  credentialHomeTitle: {
    color: '#17291F',
    fontSize: 15,
    fontWeight: '900',
  },

  credentialHomeMuted: {
    color: '#748078',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  credentialHomeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  credentialHomeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },

  dealCard: {
    minHeight: 185,
    flexDirection: 'row',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
    color: '#A3652E',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#D9A441',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  demoBadgeText: {
    color: '#10261C',
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
});
