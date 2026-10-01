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

import { CatalogScreen } from './src/screens/CatalogScreen';
import { ConditionsScreen } from './src/screens/ConditionsScreen';
import { CredentialsScreen } from './src/screens/CredentialsScreen';
import { DealsScreen } from './src/screens/DealsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';

type Tab = 'home' | 'catalog' | 'deals';

type RootStackParamList = {
  Main: undefined;
  Conditions: undefined;
  Credentials: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return (
      <SafeAreaProvider>
        <LoginScreen onToken={setToken} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main">
            {({ navigation }) => (
              <MainScreen
                token={token}
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Conditions">
            {({ navigation }) => (
              <ConditionsScreen onBack={() => navigation.goBack()} />
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function MainScreen({
  token,
  navigation,
}: {
  token: string;
  navigation: NavigationProp<RootStackParamList>;
}) {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {tab === 'home' ? (
          <HomeScreen
            token={token}
            onOpenConditions={() => navigation.navigate('Conditions')}
            onOpenCredentials={() => navigation.navigate('Credentials')}
            onOpenDeals={() => setTab('deals')}
          />
        ) : null}

        {tab === 'catalog' ? <CatalogScreen /> : null}
        {tab === 'deals' ? <DealsScreen /> : null}
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
          active={tab === 'catalog'}
          icon="fish-outline"
          activeIcon="fish"
          label="Equipos"
          onPress={() => setTab('catalog')}
        />

        <NavButton
          active={tab === 'deals'}
          icon="pricetag-outline"
          activeIcon="pricetag"
          label="Ofertas"
          onPress={() => setTab('deals')}
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
      style={({ pressed }) => [
        styles.navButton,
        pressed && styles.navButtonPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={21}
        color={active ? '#D9A441' : '#AFC0B6'}
      />
      <Text style={[styles.navText, active && styles.navTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#10261C',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  nav: {
    minHeight: 68,
    flexDirection: 'row',
    backgroundColor: '#10261C',
    borderTopWidth: 1,
    borderTopColor: '#274535',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navButtonPressed: {
    opacity: 0.68,
  },
  navText: {
    color: '#AFC0B6',
    fontSize: 12,
    fontWeight: '700',
  },
  navTextActive: {
    color: '#D9A441',
    fontWeight: '900',
  },
});
