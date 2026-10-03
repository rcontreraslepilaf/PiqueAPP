import { useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { login, registerUser } from '../services/api';

type Mode = 'login' | 'register';
type IconName = ComponentProps<typeof Ionicons>['name'];

export function LoginScreen({ onToken }: { onToken: (token: string) => void }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  async function submit() {
    setError('');
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario o correo y tu contraseña.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!displayName.trim() || !email.trim()) {
          setError('Completa nombre y correo para crear tu cuenta.');
          return;
        }
        await registerUser({
          display_name: displayName.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        });
      }
      const tokens = await login(username.trim(), password);
      onToken(tokens.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={['#031A22', '#063747', '#052633', '#021116']}
        locations={[0, 0.38, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.orbOne} />
      <View pointerEvents="none" style={styles.orbTwo} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.layout, !isDesktop && styles.layoutMobile]}>
          <View style={[styles.hero, !isDesktop && styles.heroMobile]}>
            <View style={styles.brandBadge}>
              <Ionicons name="fish-outline" size={20} color="#58C4FF" />
              <Text style={styles.brandBadgeText}>PIQUEAPP</Text>
            </View>
            <Text style={styles.heroTitle}>Vive.
Explora.
Comparte.</Text>
            <Text style={styles.heroDescription}>
              Una comunidad para amantes de la pesca y las aventuras outdoor.
            </Text>
            <View style={styles.tags}>
              <Tag icon="fish-outline" text="Pesca" />
              <Tag icon="compass-outline" text="Outdoor" />
              <Tag icon="people-outline" text="Comunidad" />
            </View>
            {isDesktop ? (
              <View style={styles.privacy}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#58C4FF" />
                <View>
                  <Text style={styles.privacyTitle}>Tus zonas secretas siguen siendo secretas.</Text>
                  <Text style={styles.privacyText}>Tú decides qué ubicación mostrar públicamente.</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a PiqueAPP'}</Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'login' ? 'Ingresa para continuar tu próxima aventura.' : 'Crea tu cuenta y comienza a compartir.'}
            </Text>

            <View style={styles.modeRow}>
              <ModeButton active={mode === 'login'} title="Ingresar" onPress={() => setMode('login')} />
              <ModeButton active={mode === 'register'} title="Crear cuenta" onPress={() => setMode('register')} />
            </View>

            {mode === 'register' ? (
              <>
                <Input icon="person-outline" placeholder="Nombre" value={displayName} onChangeText={setDisplayName} />
                <Input icon="mail-outline" placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              </>
            ) : null}

            <Input icon="person-circle-outline" placeholder="Usuario o correo" value={username} onChangeText={setUsername} autoCapitalize="none" />

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#7C929E" />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#76909C"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7C929E" />
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.primary} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#031A22" /> : (
                <>
                  <Text style={styles.primaryText}>{mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}</Text>
                  <Ionicons name="arrow-forward" size={19} color="#031A22" />
                </>
              )}
            </Pressable>

            <View style={styles.security}>
              <Ionicons name="lock-closed-outline" size={15} color="#7D9AA7" />
              <Text style={styles.securityText}>Tus datos y ubicaciones privadas están protegidos.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Input({ icon, ...props }: { icon: IconName } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={20} color="#7C929E" />
      <TextInput {...props} style={styles.input} placeholderTextColor="#76909C" />
    </View>
  );
}

function ModeButton({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{title}</Text>
    </Pressable>
  );
}

function Tag({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={16} color="#EAF8FF" />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#031A22' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  layout: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 70 },
  layoutMobile: { flexDirection: 'column', gap: 20 },
  hero: { flex: 1, paddingVertical: 30 },
  heroMobile: { width: '100%', paddingVertical: 10 },
  orbOne: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: 'rgba(18,145,201,0.18)', top: -180, right: -120 },
  orbTwo: { position: 'absolute', width: 450, height: 450, borderRadius: 225, backgroundColor: 'rgba(18,177,166,0.13)', bottom: -190, left: -130 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: 'rgba(7,32,42,0.72)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 22, borderWidth: 1, borderColor: 'rgba(88,196,255,0.18)' },
  brandBadgeText: { color: '#58C4FF', fontWeight: '900', letterSpacing: 1.8, fontSize: 12 },
  heroTitle: { color: '#FFFFFF', fontSize: 55, lineHeight: 60, fontWeight: '900', maxWidth: 550 },
  heroDescription: { color: '#C7D9E1', fontSize: 17, lineHeight: 25, maxWidth: 500, marginTop: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 24 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  tagText: { color: '#EFF9FD', fontWeight: '700', fontSize: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 35 },
  privacyTitle: { color: '#F4FBFE', fontWeight: '800', fontSize: 13 },
  privacyText: { color: '#AFC6D0', fontSize: 12, marginTop: 3 },
  card: { width: '100%', maxWidth: 480, backgroundColor: 'rgba(7,29,38,0.92)', borderRadius: 28, padding: 30, borderWidth: 1, borderColor: 'rgba(126,208,255,0.18)' },
  cardTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
  cardSubtitle: { color: '#9FB7C2', fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 20 },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 4, marginBottom: 18 },
  modeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  modeButtonActive: { backgroundColor: '#0D4052' },
  modeText: { color: '#7897A4', fontWeight: '800' },
  modeTextActive: { color: '#FFFFFF' },
  inputWrap: { height: 54, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(167,210,228,0.15)', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, marginBottom: 11 },
  input: { flex: 1, height: '100%', color: '#FFFFFF', fontSize: 15, outlineStyle: 'none' } as any,
  error: { color: '#FF9E9E', fontSize: 12, marginBottom: 10 },
  primary: { height: 54, backgroundColor: '#4ABEFF', borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 3 },
  primaryText: { color: '#031A22', fontWeight: '900', fontSize: 15 },
  security: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 17 },
  securityText: { color: '#7898A5', fontSize: 11, textAlign: 'center' },
});
