import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  searchOutdoorLocations,
  type ExploreLocation,
} from '../services/api';
import {
  formatExplorationDate,
  todayIsoValue,
  tomorrowIso,
  useExploration,
  type ExplorationActivity,
} from '../context/ExplorationContext';

const ACTIVITY_LABEL: Record<ExplorationActivity, string> = {
  fishing: 'Pesca',
  hunting: 'Caza',
  outdoor: 'Outdoor',
};

export function ExplorationBar() {
  const [visible, setVisible] = useState(false);
  const { mode, place, selectedDate, activity } = useExploration();

  const locationLabel = place?.label ?? 'Ubicación aún no definida';

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.barIcon}>
          <Ionicons
            name={mode === 'manual' ? 'search-outline' : 'location-outline'}
            size={21}
            color="#D9A441"
          />
        </View>

        <View style={styles.barContent}>
          <Text style={styles.barEyebrow}>
            {mode === 'manual' ? 'EXPLORANDO OTRA ZONA' : 'MI UBICACIÓN'}
          </Text>
          <Text style={styles.barLocation} numberOfLines={1}>
            {locationLabel}
          </Text>
          <Text style={styles.barMeta}>
            {ACTIVITY_LABEL[activity]} · {formatExplorationDate(selectedDate)}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.changeButton,
            pressed && styles.pressed,
          ]}
          onPress={() => setVisible(true)}
        >
          <Text style={styles.changeButtonText}>Cambiar</Text>
        </Pressable>
      </View>

      <ExplorationPickerModal
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

function ExplorationPickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    mode,
    place,
    selectedDate,
    activity,
    resolvingGps,
    gpsError,
    selectManualPlace,
    ensureGpsLocation,
    setSelectedDate,
    setActivity,
  } = useExploration();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExploreLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [dateDraft, setDateDraft] = useState(selectedDate);

  const selectedLabel = useMemo(
    () => place?.label ?? 'Sin zona seleccionada',
    [place],
  );

  useEffect(() => {
    if (visible) {
      setDateDraft(selectedDate);
    }
  }, [selectedDate, visible]);

  async function search() {
    const clean = query.trim();
    if (clean.length < 2) {
      setMessage('Escribe al menos 2 caracteres para buscar.');
      setResults([]);
      return;
    }

    setSearching(true);
    setMessage('');
    try {
      const payload = await searchOutdoorLocations(clean, 6);
      setResults(payload);
      if (payload.length === 0) {
        setMessage('No encontramos localidades con ese nombre en Chile.');
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo buscar la localidad.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function useGps() {
    const resolved = await ensureGpsLocation(true);
    if (resolved) {
      setMessage('Ubicación actualizada desde el dispositivo.');
    }
  }

  function choose(placeToUse: ExploreLocation) {
    selectManualPlace(placeToUse);
    setMessage(`Ahora estás explorando ${placeToUse.label}.`);
    setResults([]);
    setQuery('');
  }

  function applyDate() {
    setSelectedDate(dateDraft);
    setDateDraft(dateDraft < todayIsoValue() ? todayIsoValue() : dateDraft);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalEyebrow}>PLANIFICAR SALIDA</Text>
              <Text style={styles.modalTitle}>Zona de exploración</Text>
              <Text style={styles.modalSubtitle}>
                Usa tu GPS o revisa otra localidad antes de salir.
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#173C2C" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.selectedCard}>
              <Ionicons
                name={mode === 'manual' ? 'search-outline' : 'location-outline'}
                size={22}
                color="#D9A441"
              />
              <View style={styles.selectedContent}>
                <Text style={styles.selectedLabel}>
                  {mode === 'manual' ? 'Zona manual' : 'GPS del dispositivo'}
                </Text>
                <Text style={styles.selectedLocation}>{selectedLabel}</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.gpsButton,
                pressed && styles.pressed,
                resolvingGps && styles.disabled,
              ]}
              disabled={resolvingGps}
              onPress={() => void useGps()}
            >
              {resolvingGps ? (
                <ActivityIndicator color="#10261C" />
              ) : (
                <Ionicons name="locate-outline" size={20} color="#10261C" />
              )}
              <Text style={styles.gpsButtonText}>Usar mi ubicación actual</Text>
            </Pressable>

            {gpsError ? <Text style={styles.errorText}>{gpsError}</Text> : null}

            <Text style={styles.sectionLabel}>Explorar otra zona</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Ej.: Cholchol, Pucón, Puerto Varas"
                placeholderTextColor="#8A958E"
                returnKeyType="search"
                onSubmitEditing={() => void search()}
              />
              <Pressable
                style={styles.searchButton}
                onPress={() => void search()}
              >
                {searching ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            {results.map((item) => (
              <Pressable
                key={`${item.latitude}-${item.longitude}-${item.label}`}
                style={styles.resultRow}
                onPress={() => choose(item)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="location-outline" size={19} color="#315D49" />
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{item.locality}</Text>
                  <Text style={styles.resultMeta} numberOfLines={2}>
                    {[item.region, item.country].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#879089" />
              </Pressable>
            ))}

            <Text style={styles.sectionLabel}>Fecha de la salida</Text>
            <View style={styles.quickDateRow}>
              <DateChip
                label="Hoy"
                active={selectedDate === todayIsoValue()}
                onPress={() => {
                  const value = todayIsoValue();
                  setDateDraft(value);
                  setSelectedDate(value);
                }}
              />
              <DateChip
                label="Mañana"
                active={selectedDate === tomorrowIso()}
                onPress={() => {
                  const value = tomorrowIso();
                  setDateDraft(value);
                  setSelectedDate(value);
                }}
              />
            </View>

            <View style={styles.dateRow}>
              <TextInput
                style={styles.dateInput}
                value={dateDraft}
                onChangeText={setDateDraft}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#8A958E"
                autoCapitalize="none"
                onBlur={applyDate}
              />
              <Pressable style={styles.applyDateButton} onPress={applyDate}>
                <Text style={styles.applyDateText}>Aplicar</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              El clima futuro depende de la disponibilidad del pronóstico. Temporadas y solunar pueden consultarse para la fecha seleccionada.
            </Text>

            <Text style={styles.sectionLabel}>Actividad</Text>
            <View style={styles.activityRow}>
              <ActivityChip
                label="Pesca"
                icon="fish-outline"
                active={activity === 'fishing'}
                onPress={() => setActivity('fishing')}
              />
              <ActivityChip
                label="Caza"
                icon="paw-outline"
                active={activity === 'hunting'}
                onPress={() => setActivity('hunting')}
              />
              <ActivityChip
                label="Outdoor"
                icon="trail-sign-outline"
                active={activity === 'outdoor'}
                onPress={() => setActivity('outdoor')}
              />
            </View>

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#315D49" />
              <Text style={styles.privacyText}>
                La zona manual sirve para explorar y planificar. No reemplaza la ubicación real usada al registrar una captura o guardar un spot.
              </Text>
            </View>

            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Listo</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DateChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActivityChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.activityChip, active && styles.activityChipActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? '#10261C' : '#52655B'}
      />
      <Text
        style={[
          styles.activityChipText,
          active && styles.activityChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E3E6DF',
  },
  barIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barContent: {
    flex: 1,
    minWidth: 0,
  },
  barEyebrow: {
    color: '#A3652E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  barLocation: {
    color: '#17291F',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  barMeta: {
    color: '#718078',
    fontSize: 11,
    marginTop: 2,
  },
  changeButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: '#E3ECE6',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  changeButtonText: {
    color: '#315D49',
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,24,17,0.50)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#F4F0E5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E9E3',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalEyebrow: {
    color: '#A3652E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  modalTitle: {
    color: '#17291F',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  modalSubtitle: {
    color: '#6F7B74',
    marginTop: 3,
    lineHeight: 18,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    width: '100%',
  },
  modalBody: {
    padding: 18,
    paddingBottom: 30,
  },
  selectedCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#173C2C',
    borderRadius: 18,
    padding: 15,
  },
  selectedContent: {
    flex: 1,
  },
  selectedLabel: {
    color: '#BFD0C7',
    fontSize: 10,
    fontWeight: '800',
  },
  selectedLocation: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  gpsButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D9A441',
    borderRadius: 14,
    marginTop: 12,
  },
  gpsButtonText: {
    color: '#10261C',
    fontWeight: '900',
  },
  errorText: {
    color: '#A34D3E',
    fontSize: 12,
    marginTop: 8,
  },
  sectionLabel: {
    color: '#344A3E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 21,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE2DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#17291F',
    fontSize: 16,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: '#66756D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  resultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 7,
  },
  resultIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    color: '#17291F',
    fontWeight: '900',
  },
  resultMeta: {
    color: '#758078',
    fontSize: 11,
    marginTop: 2,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1ED',
    borderWidth: 1,
    borderColor: '#E0E4E0',
  },
  chipActive: {
    backgroundColor: '#E7C67E',
    borderColor: '#D9A441',
  },
  chipText: {
    color: '#52655B',
    fontWeight: '800',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#10261C',
    fontWeight: '900',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE2DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#17291F',
    fontSize: 16,
  },
  applyDateButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#E3ECE6',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  applyDateText: {
    color: '#315D49',
    fontWeight: '900',
  },
  helperText: {
    color: '#849088',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityChip: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 13,
    backgroundColor: '#EEF1ED',
    borderWidth: 1,
    borderColor: '#E0E4E0',
  },
  activityChipActive: {
    backgroundColor: '#E7C67E',
    borderColor: '#D9A441',
  },
  activityChipText: {
    color: '#52655B',
    fontWeight: '800',
    fontSize: 12,
  },
  activityChipTextActive: {
    color: '#10261C',
    fontWeight: '900',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#E3ECE6',
    borderRadius: 15,
    padding: 13,
    marginTop: 22,
  },
  privacyText: {
    flex: 1,
    color: '#566C60',
    fontSize: 11,
    lineHeight: 17,
  },
  doneButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#173C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
