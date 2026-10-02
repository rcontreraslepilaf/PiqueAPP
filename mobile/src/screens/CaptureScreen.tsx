import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import {
  createTrophy,
  getOutdoorContext,
  uploadTrophyImage,
} from '../services/api';

type ReleaseStatus = 'released' | 'kept';
type Visibility = 'public' | 'private';
type GeoPrivacy =
  | 'private'
  | 'region_only'
  | 'approx_5km'
  | 'exact';

export function CaptureScreen({
  token,
  onOpenWall,
}: {
  token: string;
  onOpenWall: () => void;
}) {
  const [species, setSpecies] = useState('');
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [description, setDescription] = useState('');
  const [releaseStatus, setReleaseStatus] =
    useState<ReleaseStatus>('released');
  const [visibility, setVisibility] =
    useState<Visibility>('public');
  const [geoPrivacy, setGeoPrivacy] =
    useState<GeoPrivacy>('region_only');
  const [includeLocation, setIncludeLocation] =
    useState(true);

  const [imageAsset, setImageAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  async function pickImage() {
    setMessage('');

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        'Debes permitir acceso a tus imágenes para seleccionar una foto.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) {
      setMessage('No se pudo obtener la imagen seleccionada.');
      return;
    }

    setImageAsset(asset);
  }

  async function takePhoto() {
    setMessage('');

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        'Debes permitir acceso a la cámara para registrar la captura.',
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) {
      setMessage('No se pudo obtener la fotografía.');
      return;
    }

    setImageAsset(asset);
  }

  async function saveCapture() {
    if (!species.trim()) {
      setMessage('Ingresa la especie de la captura.');
      return;
    }

    const parsedWeight = parseOptionalNumber(weight);
    const parsedLength = parseOptionalNumber(length);

    if (parsedWeight === 'invalid') {
      setMessage('El peso debe ser un número válido.');
      return;
    }

    if (parsedLength === 'invalid') {
      setMessage('El largo debe ser un número válido.');
      return;
    }

    setSaving(true);
    setMessage('');
    setSuccess(false);

    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let publicRegion: string | null = null;

      if (includeLocation) {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status === 'granted') {
          const position =
            await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

          const currentLatitude =
            position.coords.latitude;
          const currentLongitude =
            position.coords.longitude;

          latitude = currentLatitude;
          longitude = currentLongitude;

          try {
            const context = await getOutdoorContext(
              currentLatitude,
              currentLongitude,
            );
            publicRegion =
              context.location.region ??
              context.location.locality;
          } catch {
            publicRegion = null;
          }
        }
      }

      const created = await createTrophy(
        token,
        {
          activity_type: 'fishing',
          species_name: species.trim(),
          title:
            title.trim() ||
            `Captura de ${species.trim()}`,
          description:
            description.trim() || null,
          weight_kg:
            parsedWeight === null
              ? null
              : parsedWeight,
          length_cm:
            parsedLength === null
              ? null
              : parsedLength,
          captured_at: new Date().toISOString(),
          release_status: releaseStatus,
          visibility,
          geo_privacy:
            includeLocation
              ? geoPrivacy
              : 'private',
          latitude,
          longitude,
          public_region: publicRegion,
          environmental_snapshot: null,
          equipment_ids: [],
        },
      );

      if (imageAsset) {
        const mimeType =
          imageAsset.mimeType === 'image/png'
            ? 'image/png'
            : 'image/jpeg';
        const extension =
          mimeType === 'image/png'
            ? 'png'
            : 'jpg';

        await uploadTrophyImage(
          token,
          created.id,
          {
            uri: imageAsset.uri,
            fileName:
              imageAsset.fileName ??
              `captura-${created.id}.${extension}`,
            mimeType,
            webFile:
              imageAsset.file ?? null,
          },
        );
      }

      setSpecies('');
      setTitle('');
      setWeight('');
      setLength('');
      setDescription('');
      setImageAsset(null);
      setReleaseStatus('released');
      setVisibility('public');
      setGeoPrivacy('region_only');
      setSuccess(true);
      setMessage(
        'Captura guardada correctamente. Ya está disponible en tu muro.',
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la captura.',
      );
    } finally {
      setSaving(false);
    }
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
          <View style={styles.headerIcon}>
            <Ionicons
              name="fish-outline"
              size={28}
              color="#D9A441"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              NUEVA AVENTURA
            </Text>
            <Text style={styles.title}>
              Registrar captura
            </Text>
            <Text style={styles.subtitle}>
              Guarda la evidencia, medidas y privacidad de tu zona.
            </Text>
          </View>
        </View>

        <View style={styles.photoCard}>
          {imageAsset ? (
            <Image
              source={{ uri: imageAsset.uri }}
              style={styles.photoPreview}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons
                name="camera-outline"
                size={44}
                color="#547363"
              />
              <Text style={styles.photoTitle}>
                Agrega una fotografía
              </Text>
              <Text style={styles.photoText}>
                Será la imagen principal de la publicación.
              </Text>
            </View>
          )}

          <View style={styles.photoActions}>
            <ActionButton
              icon="images-outline"
              label={imageAsset ? 'Cambiar imagen' : 'Elegir imagen'}
              onPress={() => void pickImage()}
              primary
            />
            <ActionButton
              icon="camera-outline"
              label="Tomar foto"
              onPress={() => void takePhoto()}
            />
            {imageAsset ? (
              <Pressable
                style={styles.removePhotoButton}
                onPress={() => setImageAsset(null)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#9B463A"
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Datos de la captura
          </Text>

          <Field
            label="Especie *"
            value={species}
            onChangeText={setSpecies}
            placeholder="Ej.: Trucha arcoíris"
          />

          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Ej.: Jornada de la mañana"
          />

          <View style={styles.twoColumns}>
            <View style={styles.flexField}>
              <Field
                label="Peso (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="Ej.: 1.25"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flexField}>
              <Field
                label="Largo (cm)"
                value={length}
                onChangeText={setLength}
                placeholder="Ej.: 54"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Comentario
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Cuenta cómo fue la jornada, señuelo, técnica, etc."
            placeholderTextColor="#8A958E"
            multiline
          />

          <Text style={styles.groupLabel}>
            Resultado
          </Text>
          <View style={styles.optionRow}>
            <OptionChip
              active={releaseStatus === 'released'}
              icon="fish-outline"
              label="Captura y liberación"
              onPress={() => setReleaseStatus('released')}
            />
            <OptionChip
              active={releaseStatus === 'kept'}
              icon="checkmark-circle-outline"
              label="Conservada"
              onPress={() => setReleaseStatus('kept')}
            />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Privacidad
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>
                Guardar ubicación
              </Text>
              <Text style={styles.switchText}>
                Puedes guardar el punto exacto para ti y ocultarlo a la comunidad.
              </Text>
            </View>
            <Switch
              value={includeLocation}
              onValueChange={setIncludeLocation}
              trackColor={{
                false: '#D8DDD9',
                true: '#A9C9B6',
              }}
              thumbColor={
                includeLocation
                  ? '#174A36'
                  : '#F7F7F4'
              }
            />
          </View>

          <Text style={styles.groupLabel}>
            Quién puede ver la publicación
          </Text>
          <View style={styles.optionRow}>
            <OptionChip
              active={visibility === 'public'}
              icon="earth-outline"
              label="Comunidad"
              onPress={() => setVisibility('public')}
            />
            <OptionChip
              active={visibility === 'private'}
              icon="lock-closed-outline"
              label="Solo yo"
              onPress={() => setVisibility('private')}
            />
          </View>

          {includeLocation ? (
            <>
              <Text style={styles.groupLabel}>
                Ubicación que verá la comunidad
              </Text>
              <View style={styles.optionRow}>
                <OptionChip
                  active={geoPrivacy === 'private'}
                  icon="lock-closed-outline"
                  label="Oculta"
                  onPress={() => setGeoPrivacy('private')}
                />
                <OptionChip
                  active={geoPrivacy === 'region_only'}
                  icon="map-outline"
                  label="Solo región"
                  onPress={() => setGeoPrivacy('region_only')}
                />
                <OptionChip
                  active={geoPrivacy === 'approx_5km'}
                  icon="navigate-outline"
                  label="Aprox. 5 km"
                  onPress={() => setGeoPrivacy('approx_5km')}
                />
                <OptionChip
                  active={geoPrivacy === 'exact'}
                  icon="location-outline"
                  label="Exacta"
                  onPress={() => setGeoPrivacy('exact')}
                />
              </View>
            </>
          ) : null}

          <View style={styles.privacyNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color="#315D49"
            />
            <Text style={styles.privacyNoteText}>
              La ubicación exacta se almacena separada del punto público. Si eliges región u oculto, tus coordenadas no se publican.
            </Text>
          </View>
        </View>

        {message ? (
          <View
            style={[
              styles.messageCard,
              success && styles.successCard,
            ]}
          >
            <Ionicons
              name={
                success
                  ? 'checkmark-circle-outline'
                  : 'information-circle-outline'
              }
              size={21}
              color={success ? '#237447' : '#8E5D2D'}
            />
            <Text
              style={[
                styles.messageText,
                success && styles.successText,
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.saveButton,
            saving && styles.disabled,
          ]}
          disabled={saving}
          onPress={() => void saveCapture()}
        >
          {saving ? (
            <ActivityIndicator color="#10261C" />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={21}
                color="#10261C"
              />
              <Text style={styles.saveButtonText}>
                Guardar captura
              </Text>
            </>
          )}
        </Pressable>

        {success ? (
          <Pressable
            style={styles.wallButton}
            onPress={onOpenWall}
          >
            <Text style={styles.wallButtonText}>
              Ver en el muro
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#315D49"
            />
          </Pressable>
        ) : null}

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

function OptionChip({
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
        styles.optionChip,
        active && styles.optionChipActive,
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

function ActionButton({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        primary && styles.actionButtonPrimary,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color="#173C2C"
      />
      <Text style={styles.actionButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function parseOptionalNumber(
  value: string,
): number | null | 'invalid' {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'invalid';
  }
  return parsed;
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
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#153D2E',
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
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 330,
    backgroundColor: '#173C2C',
  },
  photoPlaceholder: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EEE8',
    padding: 25,
  },
  photoTitle: {
    color: '#234535',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  photoText: {
    color: '#6B7A72',
    textAlign: 'center',
    marginTop: 4,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    padding: 14,
  },
  actionButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#E3ECE6',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: '#D9A441',
  },
  actionButtonText: {
    color: '#173C2C',
    fontWeight: '900',
    fontSize: 12,
  },
  removePhotoButton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7E5E1',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 19,
    marginBottom: 16,
  },
  sectionTitle: {
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
    fontSize: 14,
  },
  textArea: {
    minHeight: 105,
    paddingTop: 12,
    textAlignVertical: 'top',
    marginBottom: 13,
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flexField: {
    flex: 1,
    minWidth: 210,
  },
  groupLabel: {
    color: '#4C5D53',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  optionChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF1ED',
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E4E0',
  },
  optionChipActive: {
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    color: '#263A2E',
    fontWeight: '900',
  },
  switchText: {
    color: '#6B7971',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  privacyNote: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#E3ECE6',
    borderRadius: 14,
    padding: 12,
  },
  privacyNoteText: {
    flex: 1,
    color: '#5B7164',
    fontSize: 12,
    lineHeight: 18,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5E9D9',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },
  successCard: {
    backgroundColor: '#DDF0E3',
  },
  messageText: {
    flex: 1,
    color: '#80572D',
    fontSize: 12,
  },
  successText: {
    color: '#237447',
  },
  saveButton: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D9A441',
    borderRadius: 15,
  },
  saveButtonText: {
    color: '#10261C',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },
  wallButton: {
    minHeight: 48,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#E3ECE6',
  },
  wallButtonText: {
    color: '#315D49',
    fontWeight: '900',
  },
  bottomSpace: {
    height: 35,
  },
});
