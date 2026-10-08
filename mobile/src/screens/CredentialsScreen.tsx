import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
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
  createCredential,
  deleteCredential,
  deleteCredentialImage,
  getCredentialImageDataUrl,
  getCredentials,
  uploadCredentialImage,
  type CredentialRecord,
} from '../services/api';

type Props = {
  token: string;
  onBack: () => void;
};

export function CredentialsScreen({
  token,
  onBack,
}: Props) {
  const [items, setItems] = useState<CredentialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingId, setUploadingId] =
    useState<string | null>(null);

  const [imageModalVisible, setImageModalVisible] =
    useState(false);
  const [imageLoading, setImageLoading] =
    useState(false);
  const [imageDataUrl, setImageDataUrl] =
    useState<string | null>(null);
  const [imageTitle, setImageTitle] =
    useState('');

  const [title, setTitle] =
    useState('Licencia de pesca recreativa');
  const [authority, setAuthority] =
    useState('SERNAPESCA');
  const [licenseNumber, setLicenseNumber] =
    useState('');
  const [validFrom, setValidFrom] =
    useState('');
  const [expiresAt, setExpiresAt] =
    useState('');
  const [notes, setNotes] =
    useState('');

  async function load() {
    setLoading(true);
    setMessage('');

    try {
      setItems(await getCredentials(token));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las credenciales.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function saveCredential() {
    if (!title.trim() || !authority.trim()) {
      setMessage(
        'Completa el nombre de la credencial y la institución emisora.',
      );
      return;
    }

    if (validFrom && !isIsoDate(validFrom)) {
      setMessage(
        'La fecha de inicio debe tener formato AAAA-MM-DD.',
      );
      return;
    }

    if (expiresAt && !isIsoDate(expiresAt)) {
      setMessage(
        'La fecha de vencimiento debe tener formato AAAA-MM-DD.',
      );
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await createCredential(token, {
        credential_type: 'fishing_license',
        title: title.trim(),
        authority: authority.trim(),
        license_number:
          licenseNumber.trim() || null,
        valid_from:
          validFrom || null,
        expires_at:
          expiresAt || null,
        notes:
          notes.trim() || null,
      });

      setLicenseNumber('');
      setValidFrom('');
      setExpiresAt('');
      setNotes('');
      setShowForm(false);

      await load();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la credencial.',
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(
    credential: CredentialRecord,
  ) {
    Alert.alert(
      'Eliminar credencial',
      `¿Quieres eliminar "${credential.title}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void removeCredential(credential.id);
          },
        },
      ],
    );
  }

  async function removeCredential(
    credentialId: string,
  ) {
    try {
      await deleteCredential(
        token,
        credentialId,
      );

      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== credentialId,
        ),
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la credencial.',
      );
    }
  }

  async function pickImage(
    credential: CredentialRecord,
  ) {
    setMessage('');

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        'Debes permitir acceso a tus imágenes para seleccionar la licencia.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      setMessage(
        'No se pudo obtener la imagen seleccionada.',
      );
      return;
    }

    await uploadSelectedImage(
      credential,
      asset,
    );
  }

  async function takePhoto(
    credential: CredentialRecord,
  ) {
    setMessage('');

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        'Debes permitir acceso a la cámara para fotografiar la licencia.',
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      setMessage(
        'No se pudo obtener la fotografía.',
      );
      return;
    }

    await uploadSelectedImage(
      credential,
      asset,
    );
  }

  async function uploadSelectedImage(
    credential: CredentialRecord,
    asset: ImagePicker.ImagePickerAsset,
  ) {
    setUploadingId(
      credential.id,
    );
    setMessage('');

    try {
      const mimeType =
        asset.mimeType === 'image/png'
          ? 'image/png'
          : 'image/jpeg';

      const extension =
        mimeType === 'image/png'
          ? 'png'
          : 'jpg';

      await uploadCredentialImage(
        token,
        credential.id,
        {
          uri: asset.uri,
          fileName:
            asset.fileName ??
            `licencia-${credential.id}.${extension}`,
          mimeType,
          webFile:
            asset.file ?? null,
        },
      );

      await load();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo subir la imagen de la licencia.',
      );
    } finally {
      setUploadingId(null);
    }
  }

  async function openCredentialImage(
    credential: CredentialRecord,
  ) {
    setImageModalVisible(true);
    setImageLoading(true);
    setImageDataUrl(null);
    setImageTitle(
      credential.title,
    );
    setMessage('');

    try {
      const dataUrl =
        await getCredentialImageDataUrl(
          token,
          credential.id,
        );

      setImageDataUrl(
        dataUrl,
      );
    } catch (err) {
      setImageModalVisible(false);

      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo mostrar la licencia.',
      );
    } finally {
      setImageLoading(false);
    }
  }

  function confirmDeleteImage(
    credential: CredentialRecord,
  ) {
    Alert.alert(
      'Eliminar imagen',
      '¿Quieres eliminar la imagen guardada de esta credencial?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar imagen',
          style: 'destructive',
          onPress: () => {
            void removeCredentialImage(
              credential.id,
            );
          },
        },
      ],
    );
  }

  async function removeCredentialImage(
    credentialId: string,
  ) {
    setMessage('');

    try {
      await deleteCredentialImage(
        token,
        credentialId,
      );

      await load();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la imagen.',
      );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
              PESCA & OUTDOOR
            </Text>
            <Text style={styles.title}>
              Mis credenciales
            </Text>
            <Text style={styles.subtitle}>
              Guarda aquí los datos de tus permisos y licencias.
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setShowForm(
                (current) => !current,
              )
            }
          >
            <Ionicons
              name={
                showForm
                  ? 'close'
                  : 'add'
              }
              size={22}
              color="#173C2C"
            />
          </Pressable>
        </View>

        <View style={styles.securityCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color="#315D49"
          />

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Copia personal de tus credenciales
            </Text>
            <Text style={styles.securityText}>
              Pesca & Outdoor no emite ni reemplaza la licencia oficial.
              Esta sección sirve para mantener tus datos disponibles en tu cuenta.
            </Text>
          </View>
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              Agregar licencia de pesca
            </Text>

            <Field
              label="Nombre"
              value={title}
              onChangeText={setTitle}
              placeholder="Licencia de pesca recreativa"
            />

            <Field
              label="Institución"
              value={authority}
              onChangeText={setAuthority}
              placeholder="SERNAPESCA"
            />

            <Field
              label="Número de licencia"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Opcional"
            />

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Field
                  label="Válida desde"
                  value={validFrom}
                  onChangeText={setValidFrom}
                  placeholder="AAAA-MM-DD"
                />
              </View>

              <View style={styles.dateField}>
                <Field
                  label="Vence el"
                  value={expiresAt}
                  onChangeText={setExpiresAt}
                  placeholder="AAAA-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>
              Observaciones
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.notesInput,
              ]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej.: licencia anual de pesca recreativa"
              placeholderTextColor="#8B9890"
            />

            <View style={styles.documentPending}>
              <Ionicons
                name="document-attach-outline"
                size={22}
                color="#7A6A49"
              />
              <Text style={styles.documentPendingText}>
                Primero guarda la credencial. Después podrás asociar una fotografía JPG o PNG.
              </Text>
            </View>

            <Pressable
              style={[
                styles.saveButton,
                saving &&
                  styles.buttonDisabled,
              ]}
              disabled={saving}
              onPress={() =>
                void saveCredential()
              }
            >
              {saving ? (
                <ActivityIndicator
                  color="#10261C"
                />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>
                    Guardar credencial
                  </Text>
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#10261C"
                  />
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {message ? (
          <View style={styles.messageCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#8E5D2D"
            />
            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Tus documentos
            </Text>
            <Text style={styles.sectionSubtitle}>
              Licencias guardadas en tu cuenta
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

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              color="#D9A441"
            />
            <Text style={styles.loadingText}>
              Cargando credenciales…
            </Text>
          </View>
        ) : null}

        {!loading &&
        items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="card-outline"
                size={30}
                color="#315D49"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Aún no tienes credenciales guardadas
            </Text>

            <Text style={styles.emptyText}>
              Agrega tu licencia de pesca para tener a mano su número y
              fecha de vencimiento.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() =>
                setShowForm(true)
              }
            >
              <Text style={styles.emptyButtonText}>
                Agregar licencia
              </Text>
            </Pressable>
          </View>
        ) : null}

        {items.map((item) => (
          <CredentialCard
            key={item.id}
            credential={item}
            uploading={
              uploadingId === item.id
            }
            onShowImage={() =>
              void openCredentialImage(item)
            }
            onPickImage={() =>
              void pickImage(item)
            }
            onTakePhoto={() =>
              void takePhoto(item)
            }
            onDeleteImage={() =>
              confirmDeleteImage(item)
            }
            onDelete={() =>
              confirmDelete(item)
            }
          />
        ))}

        <View style={styles.bottomSpace} />
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setImageModalVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalEyebrow}>
                  MIS CREDENCIALES
                </Text>
                <Text style={styles.modalTitle}>
                  {imageTitle}
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() =>
                  setImageModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={23}
                  color="#173C2C"
                />
              </Pressable>
            </View>

            <View style={styles.imageViewer}>
              {imageLoading ? (
                <ActivityIndicator
                  size="large"
                  color="#D9A441"
                />
              ) : imageDataUrl ? (
                <Image
                  source={{ uri: imageDataUrl }}
                  style={styles.licenseImage}
                  contentFit="contain"
                  transition={250}
                />
              ) : null}
            </View>

            <Text style={styles.modalNotice}>
              Copia personal almacenada en tu cuenta. Pesca & Outdoor no reemplaza el documento oficial.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function CredentialCard({
  credential,
  uploading,
  onShowImage,
  onPickImage,
  onTakePhoto,
  onDeleteImage,
  onDelete,
}: {
  credential: CredentialRecord;
  uploading: boolean;
  onShowImage: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onDeleteImage: () => void;
  onDelete: () => void;
}) {
  const status = getCredentialStatus(credential.expires_at);
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  function animateCard(toScale: number, toLift: number) {
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
      style={[
        styles.credentialMotionWrap,
        { transform: [{ scale }, { translateY: lift }] },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.credentialCard,
          pressed && styles.credentialCardPressed,
        ]}
        onPressIn={() => animateCard(0.985, 2)}
        onPressOut={() => animateCard(1, 0)}
        onHoverIn={() => animateCard(1.012, -5)}
        onHoverOut={() => animateCard(1, 0)}
      >
        <View style={styles.topographicDecor}>
          <View style={[styles.topoRing, styles.topoRingOne]} />
          <View style={[styles.topoRing, styles.topoRingTwo]} />
          <View style={[styles.topoRing, styles.topoRingThree]} />
        </View>

        <View style={styles.credentialTop}>
          <View style={styles.credentialIcon}>
            <Ionicons name="fish-outline" size={30} color="#E2AE43" />
          </View>

          <View style={styles.credentialHeading}>
            <Text style={styles.credentialTitle}>{credential.title}</Text>
            <Text style={styles.authority}>{credential.authority}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoItem label="N.º LICENCIA" value={credential.license_number || 'No ingresado'} />
          <InfoItem label="VÁLIDA DESDE" value={formatDate(credential.valid_from) || 'No informado'} />
          <InfoItem label="VENCIMIENTO" value={formatDate(credential.expires_at) || 'No informado'} />
        </View>

        {credential.notes ? <Text style={styles.notes}>{credential.notes}</Text> : null}

        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color="#E2AE43" />
            <Text style={styles.uploadingText}>Subiendo imagen…</Text>
          </View>
        ) : (
          <View style={styles.documentActions}>
            {credential.document_url ? (
              <>
                <AnimatedCredentialAction primary icon="eye-outline" label="Mostrar licencia" onPress={onShowImage} />
                <AnimatedCredentialAction icon="images-outline" label="Cambiar imagen" onPress={onPickImage} />
                <Pressable
                  style={({ pressed }) => [styles.iconDocumentButton, pressed && { opacity: 0.65 }]}
                  onPress={onDeleteImage}
                >
                  <Ionicons name="image-outline" size={18} color="#F08B79" />
                  <Ionicons name="close-circle" size={12} color="#F08B79" style={styles.smallDeleteIcon} />
                </Pressable>
              </>
            ) : (
              <>
                <AnimatedCredentialAction primary icon="images-outline" label="Elegir imagen" onPress={onPickImage} />
                <AnimatedCredentialAction icon="camera-outline" label="Tomar foto" onPress={onTakePhoto} />
              </>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.65 }]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#F08B79" />
            <Text style={styles.deleteText}>Eliminar credencial</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}


function AnimatedCredentialAction({
  primary = false,
  icon,
  label,
  onPress,
}: {
  primary?: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 30,
      bounciness: 7,
    }).start();
  }

  return (
    <Animated.View style={[styles.credentialActionWrap, { transform: [{ scale }] }]}>
      <Pressable
        style={({ pressed }) => [
          primary ? styles.primaryDocumentButton : styles.secondaryDocumentButton,
          pressed && styles.credentialActionPressed,
        ]}
        onPress={onPress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        onHoverIn={() => animate(1.02)}
        onHoverOut={() => animate(1)}
      >
        <Ionicons name={icon} size={19} color={primary ? '#10261C' : '#EAF4EF'} />
        <Text style={primary ? styles.primaryDocumentText : styles.secondaryDocumentText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
} & React.ComponentProps<
  typeof TextInput
>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#8B9890"
      />
    </View>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function getCredentialStatus(
  expiresAt: string | null,
) {
  if (!expiresAt) {
    return {
      label: 'Sin fecha',
      color: '#6C6654',
      background: '#EEEBDD',
    };
  }

  const expiration =
    new Date(
      `${expiresAt}T23:59:59`,
    );

  if (
    expiration.getTime() <
    Date.now()
  ) {
    return {
      label: 'Vencida',
      color: '#A34D3E',
      background: '#F7E5E1',
    };
  }

  const days =
    Math.ceil(
      (
        expiration.getTime() -
        Date.now()
      ) /
        86400000,
    );

  if (days <= 30) {
    return {
      label: `Vence en ${days} d`,
      color: '#9A632F',
      background: '#F5E9D9',
    };
  }

  return {
    label: 'Vigente',
    color: '#237447',
    background: '#DDF0E3',
  };
}

function formatDate(
  value: string | null,
) {
  if (!value) return '';

  const [year, month, day] =
    value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

function isIsoDate(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

const styles =
  StyleSheet.create({
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
      paddingVertical: 26,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
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
      fontWeight: '900',
      letterSpacing: 1.4,
      fontSize: 11,
    },

    title: {
      color: '#15271E',
      fontWeight: '900',
      fontSize: 28,
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

    securityCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
      marginTop: 22,
      backgroundColor: '#E3ECE6',
      padding: 17,
      borderRadius: 18,
    },

    securityContent: {
      flex: 1,
    },

    securityTitle: {
      color: '#244B38',
      fontWeight: '900',
    },

    securityText: {
      color: '#5B7164',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3,
    },

    formCard: {
      marginTop: 18,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 20,
    },

    formTitle: {
      color: '#17291F',
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 16,
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
      backgroundColor: '#F8F8F4',
      borderWidth: 1,
      borderColor: '#DDE2DC',
      borderRadius: 13,
      paddingHorizontal: 13,
      color: '#1B2D23',
      fontSize: 14,
    },

    notesInput: {
      minHeight: 90,
      paddingTop: 12,
      textAlignVertical: 'top',
    },

    dateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    dateField: {
      flex: 1,
      minWidth: 210,
    },

    documentPending: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: '#F5F0E5',
      borderRadius: 13,
      padding: 12,
      marginTop: 5,
    },

    documentPendingText: {
      flex: 1,
      color: '#7A6A49',
      fontSize: 12,
      lineHeight: 17,
    },

    saveButton: {
      minHeight: 52,
      backgroundColor: '#D9A441',
      borderRadius: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
    },

    saveButtonText: {
      color: '#10261C',
      fontWeight: '900',
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    messageCard: {
      marginTop: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#F5E9D9',
      padding: 13,
      borderRadius: 14,
    },

    messageText: {
      flex: 1,
      color: '#80572D',
      fontSize: 12,
    },

    sectionHeader: {
      marginTop: 28,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 15,
    },

    sectionTitle: {
      color: '#17291F',
      fontWeight: '900',
      fontSize: 21,
    },

    sectionSubtitle: {
      color: '#728078',
      fontSize: 13,
      marginTop: 3,
    },

    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#E3ECE6',
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingCard: {
      minHeight: 120,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    loadingText: {
      color: '#6D7A72',
    },

    emptyCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      alignItems: 'center',
      padding: 26,
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: '#E4EEE7',
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      color: '#17291F',
      fontSize: 18,
      fontWeight: '900',
      marginTop: 12,
    },

    emptyText: {
      color: '#718078',
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 520,
      marginTop: 6,
    },

    emptyButton: {
      marginTop: 15,
      backgroundColor: '#D9A441',
      paddingHorizontal: 17,
      paddingVertical: 11,
      borderRadius: 999,
    },

    emptyButtonText: {
      color: '#10261C',
      fontWeight: '900',
    },

    credentialMotionWrap: {
      marginBottom: 18,
    },

    credentialCard: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#063B2D',
      borderRadius: 28,
      padding: 28,
      borderWidth: 1,
      borderColor: 'rgba(226,174,67,0.18)',
      shadowColor: '#0B251C',
      shadowOpacity: 0.24,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 10,
    },

    credentialCardPressed: {
      borderColor: 'rgba(226,174,67,0.38)',
    },

    topographicDecor: {
      ...StyleSheet.absoluteFill,
      opacity: 0.16,
    },

    topoRing: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: '#B8D8C9',
      borderRadius: 999,
    },
    topoRingOne: { width: 260, height: 180, right: -50, top: -50 },
    topoRingTwo: { width: 360, height: 250, right: -80, top: -80 },
    topoRingThree: { width: 470, height: 330, right: -120, top: -120 },

    credentialTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      position: 'relative',
      zIndex: 2,
    },

    credentialIcon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: 'rgba(226,174,67,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(226,174,67,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    credentialHeading: {
      flex: 1,
    },

    credentialTitle: {
      color: '#F7FBF8',
      fontSize: 23,
      lineHeight: 28,
      fontWeight: '900',
    },

    authority: {
      color: '#C8D8D0',
      marginTop: 3,
      fontSize: 14,
      fontWeight: '700',
    },

    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    statusText: {
      fontWeight: '900',
      fontSize: 10,
    },

    infoGrid: {
      position: 'relative',
      zIndex: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 28,
    },

    infoItem: {
      flexGrow: 1,
      flexBasis: 180,
      backgroundColor: 'transparent',
      borderRadius: 14,
      paddingVertical: 6,
      paddingRight: 12,
    },

    infoLabel: {
      color: '#B6C9C0',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    infoValue: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 21,
      marginTop: 5,
    },

    notes: {
      position: 'relative',
      zIndex: 2,
      color: '#D8E4DE',
      lineHeight: 20,
      fontSize: 13,
      marginTop: 19,
    },

    documentSection: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#ECEFEA',
      gap: 11,
    },

    documentActions: {
      position: 'relative',
      zIndex: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 24,
      alignItems: 'center',
    },

    credentialActionWrap: {
      flexGrow: 1,
      flexBasis: 220,
    },

    credentialActionPressed: {
      opacity: 0.82,
    },

    primaryDocumentButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#E2AE43',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    primaryDocumentText: {
      color: '#10261C',
      fontSize: 14,
      fontWeight: '900',
    },

    secondaryDocumentButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderColor: 'rgba(234,244,239,0.55)',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    secondaryDocumentText: {
      color: '#EAF4EF',
      fontSize: 14,
      fontWeight: '900',
    },

    iconDocumentButton: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(240,139,121,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(240,139,121,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallDeleteIcon: {
      position: 'absolute',
      right: 6,
      top: 6,
    },

    uploadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#F5F0E5',
      borderRadius: 12,
      padding: 11,
    },

    uploadingText: {
      color: '#7A6A49',
      fontSize: 12,
      fontWeight: '700',
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(4,18,14,0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },

    modalCard: {
      width: '100%',
      maxWidth: 850,
      maxHeight: '90%',
      backgroundColor: '#F4F0E5',
      borderRadius: 24,
      padding: 18,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },

    modalHeaderText: {
      flex: 1,
    },

    modalEyebrow: {
      color: '#A3652E',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
    },

    modalTitle: {
      color: '#17291F',
      fontSize: 20,
      fontWeight: '900',
      marginTop: 2,
    },

    modalClose: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#E0E9E3',
      alignItems: 'center',
      justifyContent: 'center',
    },

    imageViewer: {
      width: '100%',
      minHeight: 420,
      maxHeight: 650,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#15271E',
      alignItems: 'center',
      justifyContent: 'center',
    },

    licenseImage: {
      width: '100%',
      height: 560,
    },

    modalNotice: {
      color: '#69766E',
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 12,
    },

    cardFooter: {
      position: 'relative',
      zIndex: 2,
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.10)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 12,
    },

    documentState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    documentStateText: {
      color: '#66756D',
      fontSize: 11,
    },

    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    deleteText: {
      color: '#F08B79',
      fontWeight: '900',
      fontSize: 12,
    },

    bottomSpace: {
      height: 30,
    },
  });
