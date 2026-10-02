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
import * as ImagePicker from 'expo-image-picker';

import {
  getMyProfile,
  getProfileAvatarDataUrl,
  updateMyProfile,
  uploadProfileAvatar,
} from '../services/api';
import type { ProfileSummary } from '../types/api';

export function ProfileScreen({
  token,
  onOpenCredentials,
  onOpenWall,
  onLogout,
}: {
  token: string;
  onOpenCredentials: () => void;
  onOpenWall: () => void;
  onLogout: () => void;
}) {
  const [profile, setProfile] =
    useState<ProfileSummary | null>(null);
  const [avatarUri, setAvatarUri] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');

    try {
      const result = await getMyProfile(token);
      setProfile(result);
      setDisplayName(result.display_name);
      setBio(result.bio ?? '');
      setRegion(result.region ?? '');

      if (result.avatar_url) {
        try {
          setAvatarUri(
            await getProfileAvatarDataUrl(token),
          );
        } catch {
          setAvatarUri(null);
        }
      } else {
        setAvatarUri(null);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el perfil.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function saveProfile() {
    if (!displayName.trim()) {
      setMessage('Tu nombre no puede quedar vacío.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const updated = await updateMyProfile(
        token,
        {
          display_name: displayName.trim(),
          bio: bio.trim(),
          region: region.trim(),
        },
      );
      setProfile(updated);
      setEditing(false);
      setMessage('Perfil actualizado correctamente.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el perfil.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function pickAvatar() {
    setMessage('');

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        'Debes permitir acceso a tus imágenes para seleccionar una foto de perfil.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) {
      setMessage('No se pudo obtener la imagen seleccionada.');
      return;
    }

    setUploading(true);

    try {
      const mimeType =
        asset.mimeType === 'image/png'
          ? 'image/png'
          : 'image/jpeg';
      const extension =
        mimeType === 'image/png'
          ? 'png'
          : 'jpg';

      const updated = await uploadProfileAvatar(
        token,
        {
          uri: asset.uri,
          fileName:
            asset.fileName ??
            `perfil-${Date.now()}.${extension}`,
          mimeType,
          webFile: asset.file ?? null,
        },
      );

      setProfile(updated);
      setAvatarUri(
        await getProfileAvatarDataUrl(token),
      );
      setMessage('Foto de perfil actualizada.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la foto de perfil.',
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color="#D9A441"
        />
        <Text style={styles.loadingText}>
          Cargando perfil…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              MI CUENTA
            </Text>
            <Text style={styles.title}>
              Perfil
            </Text>
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() => setEditing((current) => !current)}
          >
            <Ionicons
              name={editing ? 'close' : 'create-outline'}
              size={21}
              color="#315D49"
            />
          </Pressable>
        </View>

        {profile ? (
          <>
            <View style={styles.profileCard}>
              <Pressable
                style={styles.avatarButton}
                onPress={() => void pickAvatar()}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {initials(profile.display_name)}
                    </Text>
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  {uploading ? (
                    <ActivityIndicator
                      size="small"
                      color="#10261C"
                    />
                  ) : (
                    <Ionicons
                      name="camera"
                      size={15}
                      color="#10261C"
                    />
                  )}
                </View>
              </Pressable>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile.display_name}
                </Text>
                <Text style={styles.profileUser}>
                  @{profile.username}
                </Text>
                <Text style={styles.profileEmail}>
                  {profile.email}
                </Text>

                {profile.region ? (
                  <View style={styles.regionRow}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color="#66756D"
                    />
                    <Text style={styles.regionText}>
                      {profile.region}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {profile.bio ? (
              <View style={styles.bioCard}>
                <Text style={styles.bioTitle}>
                  Sobre mí
                </Text>
                <Text style={styles.bioText}>
                  {profile.bio}
                </Text>
              </View>
            ) : null}

            <View style={styles.statsGrid}>
              <StatCard
                icon="fish-outline"
                value={profile.trophy_count}
                label="Capturas"
              />
              <StatCard
                icon="card-outline"
                value={profile.credential_count}
                label="Credenciales"
              />
              <StatCard
                icon="bag-handle-outline"
                value={profile.wardrobe_count}
                label="Equipos"
              />
            </View>

            {editing ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  Editar perfil
                </Text>

                <Field
                  label="Nombre"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Tu nombre"
                />
                <Field
                  label="Región"
                  value={region}
                  onChangeText={setRegion}
                  placeholder="Ej.: La Araucanía"
                />

                <Text style={styles.fieldLabel}>
                  Biografía
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Cuéntale a la comunidad sobre tus actividades outdoor."
                  placeholderTextColor="#8A958E"
                  multiline
                />

                <Pressable
                  style={[
                    styles.saveButton,
                    saving && styles.disabled,
                  ]}
                  disabled={saving}
                  onPress={() => void saveProfile()}
                >
                  {saving ? (
                    <ActivityIndicator color="#10261C" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      Guardar cambios
                    </Text>
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

            <Text style={styles.sectionTitle}>
              Mi actividad
            </Text>

            <MenuButton
              icon="images-outline"
              title="Mis capturas"
              subtitle="Revisa tus publicaciones en el muro"
              onPress={onOpenWall}
            />
            <MenuButton
              icon="card-outline"
              title="Mis credenciales"
              subtitle="Licencias y permisos guardados"
              onPress={onOpenCredentials}
            />
            <MenuButton
              icon="log-out-outline"
              title="Cerrar sesión"
              subtitle="Salir de tu cuenta en este dispositivo"
              onPress={onLogout}
              danger
            />
          </>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              {message || 'No se pudo cargar el perfil.'}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
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

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons
        name={icon}
        size={23}
        color="#D9A441"
      />
      <Text style={styles.statValue}>
        {value}
      </Text>
      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function MenuButton({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={styles.menuButton}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIcon,
          danger && styles.menuIconDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? '#9B463A' : '#315D49'}
        />
      </View>
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            danger && styles.menuTitleDanger,
          ]}
        >
          {title}
        </Text>
        <Text style={styles.menuSubtitle}>
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color="#829087"
      />
    </Pressable>
  );
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#F4F0E5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  loadingText: {
    color: '#6D7A72',
  },
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
    maxWidth: 950,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
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
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#173C2C',
    borderRadius: 26,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  avatarButton: {
    width: 94,
    height: 94,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#315D49',
  },
  avatarFallback: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#315D49',
    borderWidth: 3,
    borderColor: '#D9A441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#D9A441',
    borderWidth: 2,
    borderColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  profileUser: {
    color: '#D9A441',
    fontWeight: '800',
    marginTop: 2,
  },
  profileEmail: {
    color: '#C5D2CB',
    fontSize: 12,
    marginTop: 4,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  regionText: {
    color: '#C5D2CB',
    fontSize: 11,
  },
  bioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },
  bioTitle: {
    color: '#26392F',
    fontWeight: '900',
  },
  bioText: {
    color: '#66756D',
    lineHeight: 20,
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
  },
  statValue: {
    color: '#17291F',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 7,
  },
  statLabel: {
    color: '#758179',
    fontSize: 11,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
  },
  formTitle: {
    color: '#17291F',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 14,
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
    minHeight: 105,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#D9A441',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
    marginTop: 12,
  },
  messageText: {
    color: '#80572D',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#17291F',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 10,
  },
  menuButton: {
    minHeight: 74,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    marginBottom: 9,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: '#F7E5E1',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: '#26392F',
    fontWeight: '900',
  },
  menuTitleDanger: {
    color: '#8A3F36',
  },
  menuSubtitle: {
    color: '#748078',
    fontSize: 11,
    marginTop: 3,
  },
  bottomSpace: {
    height: 35,
  },
});
