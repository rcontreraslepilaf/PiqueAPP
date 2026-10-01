import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  createCredential,
  deleteCredential,
  getCredentials,
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
                Carga de PDF o fotografía: la agregaremos en el siguiente paso.
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
            onDelete={() =>
              confirmDelete(item)
            }
          />
        ))}

        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
}

function CredentialCard({
  credential,
  onDelete,
}: {
  credential: CredentialRecord;
  onDelete: () => void;
}) {
  const status =
    getCredentialStatus(
      credential.expires_at,
    );

  return (
    <View style={styles.credentialCard}>
      <View style={styles.credentialTop}>
        <View style={styles.credentialIcon}>
          <Ionicons
            name="fish-outline"
            size={26}
            color="#D9A441"
          />
        </View>

        <View style={styles.credentialHeading}>
          <Text style={styles.credentialTitle}>
            {credential.title}
          </Text>

          <Text style={styles.authority}>
            {credential.authority}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  status.color,
              },
            ]}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          label="N.º licencia"
          value={
            credential.license_number ||
            'No ingresado'
          }
        />

        <InfoItem
          label="Válida desde"
          value={
            formatDate(
              credential.valid_from,
            ) || 'No informado'
          }
        />

        <InfoItem
          label="Vencimiento"
          value={
            formatDate(
              credential.expires_at,
            ) || 'No informado'
          }
        />
      </View>

      {credential.notes ? (
        <Text style={styles.notes}>
          {credential.notes}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.documentState}>
          <Ionicons
            name="document-outline"
            size={17}
            color="#66756D"
          />
          <Text style={styles.documentStateText}>
            {credential.document_url
              ? 'Documento asociado'
              : 'Sin archivo adjunto'}
          </Text>
        </View>

        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#9B463A"
          />
          <Text style={styles.deleteText}>
            Eliminar
          </Text>
        </Pressable>
      </View>
    </View>
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

    credentialCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: 19,
      marginBottom: 13,
    },

    credentialTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    credentialIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#153D2E',
      alignItems: 'center',
      justifyContent: 'center',
    },

    credentialHeading: {
      flex: 1,
    },

    credentialTitle: {
      color: '#17291F',
      fontSize: 17,
      fontWeight: '900',
    },

    authority: {
      color: '#738078',
      marginTop: 3,
      fontSize: 12,
    },

    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    statusText: {
      fontWeight: '900',
      fontSize: 10,
    },

    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
    },

    infoItem: {
      flexGrow: 1,
      flexBasis: 180,
      backgroundColor: '#F7F7F2',
      borderRadius: 14,
      padding: 12,
    },

    infoLabel: {
      color: '#7A867F',
      fontSize: 10,
    },

    infoValue: {
      color: '#24372C',
      fontWeight: '800',
      marginTop: 3,
    },

    notes: {
      color: '#5E6D64',
      lineHeight: 19,
      fontSize: 12,
      marginTop: 14,
    },

    cardFooter: {
      marginTop: 16,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: '#ECEFEA',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      color: '#9B463A',
      fontWeight: '800',
      fontSize: 11,
    },

    bottomSpace: {
      height: 30,
    },
  });
