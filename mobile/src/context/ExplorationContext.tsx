import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';

import {
  reverseOutdoorLocation,
  type ExploreLocation,
} from '../services/api';

export type ExplorationActivity = 'fishing' | 'hunting' | 'outdoor';
export type ExplorationMode = 'gps' | 'manual';

type PersistedExploration = {
  mode: ExplorationMode;
  manualPlace: ExploreLocation | null;
  selectedDate: string;
  activity: ExplorationActivity;
};

type ExplorationContextValue = {
  mode: ExplorationMode;
  place: ExploreLocation | null;
  selectedDate: string;
  activity: ExplorationActivity;
  hydrated: boolean;
  resolvingGps: boolean;
  gpsError: string;
  selectManualPlace: (place: ExploreLocation) => void;
  ensureGpsLocation: (requestPermission?: boolean) => Promise<ExploreLocation | null>;
  setSelectedDate: (value: string) => void;
  setActivity: (value: ExplorationActivity) => void;
};

const STORAGE_KEY = 'pesca-outdoor.exploration.v1';

const ExplorationContext = createContext<ExplorationContextValue | null>(null);

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string) {
  const today = todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  return value < today ? today : value;
}

export function ExplorationProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ExplorationMode>('gps');
  const [place, setPlace] = useState<ExploreLocation | null>(null);
  const [selectedDate, setSelectedDateState] = useState(todayIso());
  const [activity, setActivityState] =
    useState<ExplorationActivity>('fishing');
  const [hydrated, setHydrated] = useState(false);
  const [resolvingGps, setResolvingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;

        try {
          const saved = JSON.parse(raw) as Partial<PersistedExploration>;
          const savedMode = saved.mode === 'manual' ? 'manual' : 'gps';
          const savedActivity: ExplorationActivity =
            saved.activity === 'hunting' || saved.activity === 'outdoor'
              ? saved.activity
              : 'fishing';

          setMode(savedMode);
          setActivityState(savedActivity);
          setSelectedDateState(normalizeDate(saved.selectedDate ?? todayIso()));

          if (savedMode === 'manual' && saved.manualPlace) {
            setPlace(saved.manualPlace);
          }
        } catch {
          // Si el dato guardado está corrupto, se usa la configuración por defecto.
        }
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload: PersistedExploration = {
      mode,
      manualPlace: mode === 'manual' ? place : null,
      selectedDate,
      activity,
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [activity, hydrated, mode, place, selectedDate]);

  function selectManualPlace(nextPlace: ExploreLocation) {
    setMode('manual');
    setPlace(nextPlace);
    setGpsError('');
  }

  async function ensureGpsLocation(
    requestPermission = false,
  ): Promise<ExploreLocation | null> {
    setResolvingGps(true);
    setGpsError('');

    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setMode('gps');
        setPlace(null);
        setGpsError(
          'La ubicación está desactivada. Puedes activarla o elegir una zona manualmente.',
        );
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const resolved = await reverseOutdoorLocation(
        position.coords.latitude,
        position.coords.longitude,
      );

      const nextPlace: ExploreLocation = {
        ...resolved,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setMode('gps');
      setPlace(nextPlace);
      return nextPlace;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo obtener la ubicación del dispositivo.';
      setGpsError(message);
      return null;
    } finally {
      setResolvingGps(false);
    }
  }

  function setSelectedDate(value: string) {
    setSelectedDateState(normalizeDate(value));
  }

  function setActivity(value: ExplorationActivity) {
    setActivityState(value);
  }

  const value = useMemo<ExplorationContextValue>(
    () => ({
      mode,
      place,
      selectedDate,
      activity,
      hydrated,
      resolvingGps,
      gpsError,
      selectManualPlace,
      ensureGpsLocation,
      setSelectedDate,
      setActivity,
    }),
    [
      activity,
      gpsError,
      hydrated,
      mode,
      place,
      resolvingGps,
      selectedDate,
    ],
  );

  return (
    <ExplorationContext.Provider value={value}>
      {children}
    </ExplorationContext.Provider>
  );
}

export function useExploration() {
  const value = useContext(ExplorationContext);
  if (!value) {
    throw new Error('useExploration debe usarse dentro de ExplorationProvider.');
  }
  return value;
}

export function formatExplorationDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function isToday(value: string) {
  return value === todayIso();
}

export function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIsoValue() {
  return todayIso();
}
