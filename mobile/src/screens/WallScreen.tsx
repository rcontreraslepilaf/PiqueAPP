import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ShareMenu } from '../components/ShareMenu';
import {
  addTrophyComment,
  getFeed,
  getTrophyComments,
  deleteTrophy,
  getTrophyImageDataUrl,
  toggleTrophyLike,
} from '../services/api';
import type {
  FeedItem,
  TrophyComment,
} from '../types/api';

const PUBLIC_WEB_URL = 'https://pescaoutdoor.cl';

type FeedScope = 'community' | 'mine';

export function WallScreen({
  token,
  onBack,
}: {
  token: string;
  onBack: () => void;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [scope, setScope] = useState<FeedScope>('community');
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<string | null>(null);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [openCommentsId, setOpenCommentsId] =
    useState<string | null>(null);
  const [comments, setComments] =
    useState<Record<string, TrophyComment[]>>({});
  const [commentsLoading, setCommentsLoading] =
    useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] =
    useState(false);

  const [shareVisible, setShareVisible] = useState(false);
  const [shareTarget, setShareTarget] = useState({
    title: 'Pesca & Outdoor',
    text: 'Mira esta captura en Pesca & Outdoor.',
    url: PUBLIC_WEB_URL,
  });

  async function load() {
    setLoading(true);
    setMessage('');

    try {
      setItems(await getFeed(token, scope === 'mine'));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el muro.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token, scope]);

  async function like(item: FeedItem) {
    try {
      const result = await toggleTrophyLike(
        token,
        item.id,
      );

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                liked_by_me: result.liked,
                like_count: result.like_count,
              }
            : candidate,
        ),
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el Me gusta.',
      );
    }
  }

  async function toggleComments(item: FeedItem) {
    if (openCommentsId === item.id) {
      setOpenCommentsId(null);
      setCommentText('');
      return;
    }

    setOpenCommentsId(item.id);
    setCommentText('');

    if (comments[item.id]) return;

    setCommentsLoading(item.id);
    try {
      const result = await getTrophyComments(
        token,
        item.id,
      );
      setComments((current) => ({
        ...current,
        [item.id]: result,
      }));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los comentarios.',
      );
    } finally {
      setCommentsLoading(null);
    }
  }

  async function postComment(item: FeedItem) {
    if (!commentText.trim()) return;

    setPostingComment(true);
    setMessage('');

    try {
      const created = await addTrophyComment(
        token,
        item.id,
        commentText.trim(),
      );

      setComments((current) => ({
        ...current,
        [item.id]: [
          ...(current[item.id] ?? []),
          created,
        ],
      }));

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                comment_count:
                  candidate.comment_count + 1,
              }
            : candidate,
        ),
      );

      setCommentText('');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo publicar el comentario.',
      );
    } finally {
      setPostingComment(false);
    }
  }

  async function removeOwnCapture(item: FeedItem) {
    if (scope !== 'mine') return;

    if (deleteConfirmId !== item.id) {
      setDeleteConfirmId(item.id);
      setMessage('Pulsa nuevamente Eliminar para confirmar.');
      return;
    }

    setDeletingId(item.id);
    setMessage('');

    try {
      await deleteTrophy(token, item.id);
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      setComments((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (openCommentsId === item.id) {
        setOpenCommentsId(null);
      }
      setDeleteConfirmId(null);
      setMessage('Captura eliminada correctamente.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la captura.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  function share(item: FeedItem) {
    setShareTarget({
      title: `${item.species_name} · ${item.title}`,
      text:
        item.description ??
        'Mira esta captura compartida en Pesca & Outdoor.',
      url: `${PUBLIC_WEB_URL}/trofeo/${item.id}`,
    });
    setShareVisible(true);
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={onBack}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#FFFFFF"
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                COMUNIDAD
              </Text>
              <Text style={styles.title}>
                Muro de aventuras
              </Text>
              <Text style={styles.subtitle}>
                Capturas compartidas por la comunidad.
              </Text>
            </View>

            <Pressable
              style={styles.refreshButton}
              onPress={() => void load()}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color="#315D49"
              />
            </Pressable>
          </View>

          <View style={styles.privacyBanner}>
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color="#315D49"
            />
            <Text style={styles.privacyText}>
              Los puntos exactos se respetan según la privacidad elegida por cada usuario.
            </Text>
          </View>

          <View style={styles.scopeRow}>
            <Pressable
              style={[
                styles.scopeChip,
                scope === 'community' && styles.scopeChipActive,
              ]}
              onPress={() => {
                setDeleteConfirmId(null);
                setScope('community');
              }}
            >
              <Ionicons
                name="people-outline"
                size={17}
                color={scope === 'community' ? '#10261C' : '#526159'}
              />
              <Text
                style={[
                  styles.scopeChipText,
                  scope === 'community' && styles.scopeChipTextActive,
                ]}
              >
                Comunidad
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.scopeChip,
                scope === 'mine' && styles.scopeChipActive,
              ]}
              onPress={() => {
                setDeleteConfirmId(null);
                setScope('mine');
              }}
            >
              <Ionicons
                name="person-outline"
                size={17}
                color={scope === 'mine' ? '#10261C' : '#526159'}
              />
              <Text
                style={[
                  styles.scopeChipText,
                  scope === 'mine' && styles.scopeChipTextActive,
                ]}
              >
                Mis capturas
              </Text>
            </Pressable>
          </View>

          {message ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                {message}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="large"
                color="#D9A441"
              />
              <Text style={styles.loadingText}>
                Cargando aventuras…
              </Text>
            </View>
          ) : null}

          {!loading && items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="fish-outline"
                size={40}
                color="#315D49"
              />
              <Text style={styles.emptyTitle}>
                {scope === 'mine'
                  ? 'Aún no tienes capturas'
                  : 'Aún no hay capturas publicadas'}
              </Text>
              <Text style={styles.emptyText}>
                {scope === 'mine'
                  ? 'Tus capturas guardadas aparecerán aquí.'
                  : 'Registra la primera desde el botón Captura.'}
              </Text>
            </View>
          ) : null}

          {items.map((item) => (
            <View
              key={item.id}
              style={styles.card}
            >
              <View style={styles.authorRow}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {initials(item.author_name)}
                  </Text>
                </View>
                <View style={styles.authorText}>
                  <Text style={styles.authorName}>
                    {item.author_name}
                  </Text>
                  <Text style={styles.authorMeta}>
                    {formatDateTime(item.captured_at)}
                  </Text>
                </View>
                <View style={styles.releaseBadge}>
                  <Text style={styles.releaseText}>
                    {item.release_status === 'released'
                      ? 'Liberada'
                      : item.release_status === 'kept'
                        ? 'Conservada'
                        : 'Registro'}
                  </Text>
                </View>
              </View>

              <TrophyImage
                token={token}
                trophyId={item.id}
                hasImage={item.has_image}
              />

              <View style={styles.content}>
                <Text style={styles.species}>
                  {item.species_name}
                </Text>
                <Text style={styles.cardTitle}>
                  {item.title}
                </Text>

                <View style={styles.metrics}>
                  {item.length_cm !== null ? (
                    <Metric
                      icon="resize-outline"
                      text={`${item.length_cm} cm`}
                    />
                  ) : null}
                  {item.weight_kg !== null ? (
                    <Metric
                      icon="scale-outline"
                      text={`${item.weight_kg} kg`}
                    />
                  ) : null}
                  <Metric
                    icon="location-outline"
                    text={
                      item.public_region ??
                      'Ubicación protegida'
                    }
                  />
                </View>

                {item.description ? (
                  <Text style={styles.description}>
                    {item.description}
                  </Text>
                ) : null}

                {item.equipment.length > 0 ? (
                  <View style={styles.equipmentBlock}>
                    <View style={styles.equipmentHeader}>
                      <Ionicons
                        name="bag-handle-outline"
                        size={17}
                        color="#315D49"
                      />
                      <Text style={styles.equipmentTitle}>
                        Equipo utilizado
                      </Text>
                    </View>

                    <View style={styles.equipmentList}>
                      {item.equipment.map((equipment) => (
                        <View
                          key={equipment.id}
                          style={styles.equipmentChip}
                        >
                          <Ionicons
                            name={equipmentIcon(equipment.category)}
                            size={15}
                            color="#A3652E"
                          />
                          <View style={styles.equipmentChipText}>
                            <Text
                              style={styles.equipmentName}
                              numberOfLines={1}
                            >
                              {equipment.name}
                            </Text>
                            <Text
                              style={styles.equipmentMeta}
                              numberOfLines={1}
                            >
                              {[equipment.brand, equipment.model]
                                .filter(Boolean)
                                .join(' · ') || equipment.category}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.socialRow}>
                  <Pressable
                    style={styles.socialButton}
                    onPress={() => void like(item)}
                  >
                    <Ionicons
                      name={
                        item.liked_by_me
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={21}
                      color={
                        item.liked_by_me
                          ? '#B94A45'
                          : '#526159'
                      }
                    />
                    <Text style={styles.socialText}>
                      {item.like_count}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.socialButton}
                    onPress={() =>
                      void toggleComments(item)
                    }
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>
                      {item.comment_count}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.socialButton}
                    onPress={() => share(item)}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color="#526159"
                    />
                    <Text style={styles.socialText}>
                      Compartir
                    </Text>
                  </Pressable>


                  {scope === 'mine' ? (
                    <Pressable
                      style={[
                        styles.deleteCaptureButton,
                        deleteConfirmId === item.id &&
                          styles.deleteCaptureButtonConfirm,
                      ]}
                      disabled={deletingId === item.id}
                      onPress={() => void removeOwnCapture(item)}
                    >
                      {deletingId === item.id ? (
                        <ActivityIndicator
                          size="small"
                          color="#9B463A"
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#9B463A"
                        />
                      )}
                      <Text style={styles.deleteCaptureText}>
                        {deleteConfirmId === item.id
                          ? 'Confirmar eliminar'
                          : 'Eliminar'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {openCommentsId === item.id ? (
                  <View style={styles.commentsArea}>
                    {commentsLoading === item.id ? (
                      <ActivityIndicator color="#D9A441" />
                    ) : null}

                    {(comments[item.id] ?? []).map(
                      (comment) => (
                        <View
                          key={comment.id}
                          style={styles.comment}
                        >
                          <Text style={styles.commentAuthor}>
                            {comment.author_name}
                          </Text>
                          <Text style={styles.commentBody}>
                            {comment.body}
                          </Text>
                        </View>
                      ),
                    )}

                    <View style={styles.commentComposer}>
                      <TextInput
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Escribe un comentario…"
                        placeholderTextColor="#8A958E"
                      />
                      <Pressable
                        style={[
                          styles.sendButton,
                          postingComment && styles.disabled,
                        ]}
                        disabled={postingComment}
                        onPress={() =>
                          void postComment(item)
                        }
                      >
                        {postingComment ? (
                          <ActivityIndicator
                            size="small"
                            color="#10261C"
                          />
                        ) : (
                          <Ionicons
                            name="send"
                            size={18}
                            color="#10261C"
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : null}
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

function TrophyImage({
  token,
  trophyId,
  hasImage,
}: {
  token: string;
  trophyId: string;
  hasImage: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasImage);

  useEffect(() => {
    let active = true;

    if (!hasImage) {
      setLoading(false);
      setUri(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    getTrophyImageDataUrl(token, trophyId)
      .then((result) => {
        if (active) setUri(result);
      })
      .catch(() => {
        if (active) setUri(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasImage, token, trophyId]);

  if (loading) {
    return (
      <View style={styles.imageState}>
        <ActivityIndicator color="#D9A441" />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.imageState}>
        <Ionicons
          name="image-outline"
          size={40}
          color="#6B8377"
        />
        <Text style={styles.imageStateText}>
          Sin fotografía
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.trophyImage}
      contentFit="cover"
      transition={250}
    />
  );
}

function Metric({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons
        name={icon}
        size={15}
        color="#68766E"
      />
      <Text style={styles.metricText}>
        {text}
      </Text>
    </View>
  );
}

function equipmentIcon(
  category: string,
): keyof typeof Ionicons.glyphMap {
  const normalized = category.toLowerCase();

  if (normalized.includes('caña')) return 'remove-outline';
  if (normalized.includes('carrete')) return 'sync-outline';
  if (normalized.includes('señuelo')) return 'fish-outline';
  if (normalized.includes('ropa')) return 'shirt-outline';
  if (normalized.includes('línea') || normalized.includes('linea')) {
    return 'analytics-outline';
  }

  return 'bag-handle-outline';
}

function initials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return 'PO';
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
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
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 18,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#123D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#A3652E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: '#15271E',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: '#6D7A72',
    marginTop: 3,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#E3ECE6',
    borderRadius: 16,
    padding: 13,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    color: '#557064',
    fontSize: 12,
    lineHeight: 18,
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  scopeChip: {
    minHeight: 41,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 13,
    backgroundColor: '#EEF1ED',
    borderWidth: 1,
    borderColor: '#E0E4E0',
  },
  scopeChipActive: {
    backgroundColor: '#E7C67E',
    borderColor: '#D9A441',
  },
  scopeChipText: {
    color: '#526159',
    fontSize: 12,
    fontWeight: '800',
  },
  scopeChipTextActive: {
    color: '#10261C',
    fontWeight: '900',
  },
  messageCard: {
    backgroundColor: '#F5E9D9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    color: '#80572D',
    fontSize: 12,
  },
  loadingCard: {
    minHeight: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  loadingText: {
    color: '#6D7A72',
  },
  emptyCard: {
    minHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#17291F',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyText: {
    color: '#718078',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#D9A441',
    fontWeight: '900',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    color: '#21352A',
    fontWeight: '900',
  },
  authorMeta: {
    color: '#7B867F',
    fontSize: 11,
    marginTop: 2,
  },
  releaseBadge: {
    backgroundColor: '#E3ECE6',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  releaseText: {
    color: '#315D49',
    fontSize: 10,
    fontWeight: '900',
  },
  trophyImage: {
    width: '100%',
    height: 410,
    backgroundColor: '#173C2C',
  },
  imageState: {
    width: '100%',
    height: 280,
    backgroundColor: '#DDE8E0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageStateText: {
    color: '#64786D',
    fontSize: 12,
  },
  content: {
    padding: 17,
  },
  species: {
    color: '#A3652E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#17291F',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 3,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F3EF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricText: {
    color: '#68766E',
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    color: '#5E6D64',
    lineHeight: 20,
    marginTop: 12,
  },
  equipmentBlock: {
    marginTop: 14,
    borderRadius: 15,
    backgroundColor: '#F7F4EA',
    padding: 12,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 9,
  },
  equipmentTitle: {
    color: '#2C4638',
    fontSize: 12,
    fontWeight: '900',
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    minWidth: 175,
    flexGrow: 1,
    flexBasis: 220,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0DED4',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  equipmentChipText: {
    flex: 1,
  },
  equipmentName: {
    color: '#21352A',
    fontSize: 11,
    fontWeight: '900',
  },
  equipmentMeta: {
    color: '#7B867F',
    fontSize: 9,
    marginTop: 1,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFEA',
  },
  socialButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
  },
  socialText: {
    color: '#526159',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteCaptureButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#F7E5E1',
  },
  deleteCaptureButtonConfirm: {
    borderWidth: 1,
    borderColor: '#C76A5B',
  },
  deleteCaptureText: {
    color: '#9B463A',
    fontSize: 11,
    fontWeight: '900',
  },
  commentsArea: {
    marginTop: 10,
    backgroundColor: '#F7F7F2',
    borderRadius: 14,
    padding: 11,
    gap: 8,
  },
  comment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
  },
  commentAuthor: {
    color: '#2C4638',
    fontSize: 11,
    fontWeight: '900',
  },
  commentBody: {
    color: '#5B6A62',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderColor: '#DDE2DC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    color: '#1B2D23',
  },
  sendButton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#D9A441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  bottomSpace: {
    height: 30,
  },
});
