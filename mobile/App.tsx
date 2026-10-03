import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  type NavigationProp,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ExplorationProvider } from './src/context/ExplorationContext';

import { CaptureScreen } from './src/screens/CaptureScreen';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { ConditionsScreen } from './src/screens/ConditionsScreen';
import { CredentialsScreen } from './src/screens/CredentialsScreen';
import { DealsScreen } from './src/screens/DealsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { WallScreen } from './src/screens/WallScreen';

type Tab =
  | 'home'
  | 'map'
  | 'capture'
  | 'catalog'
  | 'profile';

type RootStackParamList = {
  Main: undefined;
  Conditions: undefined;
  Credentials: undefined;
  Deals: undefined;
  Wall: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [token, setToken] =
    useState<string | null>(null);

  if (!token) {
    return (
      <SafeAreaProvider>
        <LoginScreen onToken={setToken} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ExplorationProvider>
        <NavigationContainer>
          <Stack.Navigator
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Main">
            {({ navigation }) => (
              <MainScreen
                token={token}
                navigation={navigation}
                onLogout={() => setToken(null)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Conditions">
            {({ navigation }) => (
              <ConditionsScreen
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Credentials">
            {({ navigation }) => (
              <CredentialsScreen
                token={token}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Deals">
            {({ navigation }) => (
              <DealsScreen
                token={token}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Wall">
            {({ navigation }) => (
              <WallScreen
                token={token}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </ExplorationProvider>
    </SafeAreaProvider>
  );
}

function MainScreen({
  token,
  navigation,
  onLogout,
}: {
  token: string;
  navigation: NavigationProp<RootStackParamList>;
  onLogout: () => void;
}) {
  const [tab, setTab] =
    useState<Tab>('home');

  const openWall = () =>
    navigation.navigate('Wall');

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {tab === 'home' ? (
          <HomeScreen
            token={token}
            onOpenConditions={() =>
              navigation.navigate('Conditions')
            }
            onOpenCredentials={() =>
              navigation.navigate('Credentials')
            }
            onOpenDeals={() =>
              navigation.navigate('Deals')
            }
            onOpenMap={() => setTab('map')}
            onOpenCapture={() => setTab('capture')}
            onOpenWall={openWall}
          />
        ) : null}

        {tab === 'map' ? (
          <MapScreen token={token} />
        ) : null}

        {tab === 'capture' ? (
          <CaptureScreen
            token={token}
            onOpenWall={openWall}
          />
        ) : null}

        {tab === 'catalog' ? (
          <CatalogScreen
            token={token}
            onOpenDeals={() =>
              navigation.navigate('Deals')
            }
          />
        ) : null}

        {tab === 'profile' ? (
          <ProfileScreen
            token={token}
            onOpenCredentials={() =>
              navigation.navigate('Credentials')
            }
            onOpenWall={openWall}
            onLogout={onLogout}
          />
        ) : null}
      </View>

      <View style={styles.nav}>
        <NavButton
          active={tab === 'home'}
          icon="home-outline"
          activeIcon="home"
          label="Inicio"
          onPress={() => setTab('home')}
        />

        <NavButton
          active={tab === 'map'}
          icon="map-outline"
          activeIcon="map"
          label="Mapa"
          onPress={() => setTab('map')}
        />

        <CaptureNavButton
          active={tab === 'capture'}
          onPress={() => setTab('capture')}
        />

        <NavButton
          active={tab === 'catalog'}
          icon="fish-outline"
          activeIcon="fish"
          label="Equipos"
          onPress={() => setTab('catalog')}
        />

        <NavButton
          active={tab === 'profile'}
          icon="person-outline"
          activeIcon="person"
          label="Perfil"
          onPress={() => setTab('profile')}
        />
      </View>
    </SafeAreaView>
  );
}

function NavButton({
  active,
  icon,
  activeIcon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [
        styles.navButton,
        pressed && styles.navButtonPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={21}
        color={
          active
            ? '#39B5FF'
            : '#89A5B1'
        }
      />
      <Text
        style={[
          styles.navText,
          active && styles.navTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CaptureNavButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.captureNavWrapper}
      onPress={onPress}
    >
      <View
        style={[
          styles.captureNavCircle,
          active && styles.captureNavCircleActive,
        ]}
      >
        <Ionicons
          name="add"
          size={31}
          color="#10261C"
        />
      </View>
      <Text
        style={[
          styles.captureNavText,
          active && styles.navTextActive,
        ]}
      >
        Captura
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#031A22',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  nav: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#031A22',
    borderTopWidth: 1,
    borderTopColor: '#274535',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 58,
  },
  navButtonPressed: {
    opacity: 0.68,
  },
  navText: {
    color: '#89A5B1',
    fontSize: 10,
    fontWeight: '700',
  },
  navTextActive: {
    color: '#39B5FF',
    fontWeight: '900',
  },
  captureNavWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 7,
    minWidth: 68,
  },
  captureNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -20,
    backgroundColor: '#39B5FF',
    borderWidth: 4,
    borderColor: '#031A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureNavCircleActive: {
    backgroundColor: '#E8BD62',
    transform: [{ scale: 1.04 }],
  },
  captureNavText: {
    color: '#89A5B1',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
});
