import {
  useRef,
  useState,
  type ComponentProps,
} from 'react';

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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import {
  login,
  registerUser,
} from '../services/api';

type Mode = 'login' | 'register';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BACKGROUND_IMAGE = require('../../assets/images/login-bg.jpg');

export function LoginScreen({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 900;

  const [mode, setMode] =
    useState<Mode>('login');

  const [displayName, setDisplayName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [info, setInfo] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  async function submitLogin() {
    if (
      !username.trim() ||
      !password
    ) {
      setError(
        'Ingresa tu usuario o correo y tu contraseña.',
      );

      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const tokens =
        await login(
          username.trim(),
          password,
        );

      onToken(
        tokens.access_token,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    if (
      !displayName.trim() ||
      !email.trim() ||
      !username.trim() ||
      !password
    ) {
      setError(
        'Completa todos los campos para crear tu cuenta.',
      );

      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      await registerUser({
        display_name:
          displayName.trim(),

        email:
          email.trim(),

        username:
          username.trim(),

        password,
      });

      const tokens =
        await login(
          username.trim(),
          password,
        );

      onToken(
        tokens.access_token,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  function socialPending(
    provider: string,
  ) {
    setError('');

    setInfo(
      `${provider} ya está preparado en el diseño. ` +
        'En el siguiente paso configuraremos la autenticación OAuth real.',
    );
  }

  function changeMode(
    newMode: Mode,
  ) {
    setMode(newMode);
    setError('');
    setInfo('');
  }

  return (
    <View style={styles.page}>
      <Image
        source={BACKGROUND_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={500}
      />

      <LinearGradient
        colors={[
          'rgba(4,18,14,0.38)',
          'rgba(4,18,14,0.72)',
          'rgba(4,18,14,0.91)',
        ]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={
          styles.scroll
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.layout,

            !isDesktop &&
              styles.layoutMobile,
          ]}
        >
          <View
            style={[
              styles.hero,

              !isDesktop &&
                styles.heroMobile,
            ]}
          >
            <View
              style={
                styles.brandBadge
              }
            >
              <Ionicons
                name="fish-outline"
                size={20}
                color="#D9A441"
              />

              <Text
                style={
                  styles.brandBadgeText
                }
              >
                PESCA & OUTDOOR
              </Text>
            </View>

            <Text
              style={
                styles.heroTitle
              }
            >
              Vive.
              {'\n'}
              Explora.
              {'\n'}
              Comparte.
            </Text>

            <Text
              style={
                styles.heroDescription
              }
            >
              Una comunidad para
              amantes de la pesca,
              la caza deportiva y
              las aventuras outdoor.
            </Text>

            <View
              style={
                styles.heroTags
              }
            >
              <HeroTag
                icon="fish-outline"
                text="Pesca"
              />

              <HeroTag
                icon="compass-outline"
                text="Outdoor"
              />

              <HeroTag
                icon="people-outline"
                text="Comunidad"
              />

              <HeroTag
                icon="pricetag-outline"
                text="Ofertas"
              />
            </View>

            {isDesktop ? (
              <View
                style={
                  styles.privacyNote
                }
              >
                <View
                  style={
                    styles.privacyIcon
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color="#D9A441"
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.privacyTitle
                    }
                  >
                    Tus zonas secretas
                    siguen siendo secretas.
                  </Text>

                  <Text
                    style={
                      styles.privacyText
                    }
                  >
                    Tú decides qué ubicación
                    mostrar públicamente.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={
              styles.authCard
            }
          >
            {!isDesktop ? (
              <Text
                style={
                  styles.mobileBrand
                }
              >
                PESCA & OUTDOOR
              </Text>
            ) : null}

            <Text
              style={
                styles.cardTitle
              }
            >
              {mode === 'login'
                ? 'Bienvenido de vuelta'
                : 'Únete a la comunidad'}
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              {mode === 'login'
                ? 'Ingresa para continuar tu próxima aventura.'
                : 'Crea tu cuenta gratuita y comienza a compartir.'}
            </Text>

            <View
              style={
                styles.modeSelector
              }
            >
              <ModeButton
                title="Ingresar"
                active={
                  mode === 'login'
                }
                onPress={() =>
                  changeMode(
                    'login',
                  )
                }
              />

              <ModeButton
                title="Crear cuenta"
                active={
                  mode ===
                  'register'
                }
                onPress={() =>
                  changeMode(
                    'register',
                  )
                }
              />
            </View>

            <SocialButton
              icon="logo-google"
              title={
                mode === 'login'
                  ? 'Continuar con Google'
                  : 'Registrarse con Google'
              }
              onPress={() =>
                socialPending(
                  'Google',
                )
              }
            />

            <SocialButton
              icon="logo-facebook"
              title={
                mode === 'login'
                  ? 'Continuar con Facebook'
                  : 'Registrarse con Facebook'
              }
              onPress={() =>
                socialPending(
                  'Facebook',
                )
              }
            />

            <View
              style={
                styles.divider
              }
            >
              <View
                style={
                  styles.dividerLine
                }
              />

              <Text
                style={
                  styles.dividerText
                }
              >
                o continúa con correo
              </Text>

              <View
                style={
                  styles.dividerLine
                }
              />
            </View>

            {mode ===
            'register' ? (
              <>
                <FormInput
                  icon="person-outline"
                  placeholder="Nombre"
                  value={
                    displayName
                  }
                  onChangeText={
                    setDisplayName
                  }
                />

                <FormInput
                  icon="mail-outline"
                  placeholder="Correo electrónico"
                  value={email}
                  onChangeText={
                    setEmail
                  }
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </>
            ) : null}

            <FormInput
              icon="person-circle-outline"
              placeholder={
                mode === 'login'
                  ? 'Usuario o correo'
                  : 'Nombre de usuario'
              }
              value={username}
              onChangeText={
                setUsername
              }
              autoCapitalize="none"
            />

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#66766D"
              />

              <TextInput
                style={
                  styles.input
                }
                placeholder="Contraseña"
                placeholderTextColor="#8B9890"
                value={password}
                onChangeText={
                  setPassword
                }
                secureTextEntry={
                  !showPassword
                }
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    (current) =>
                      !current,
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color="#66766D"
                />
              </Pressable>
            </View>

            {mode ===
            'login' ? (
              <Pressable
                style={
                  styles.forgot
                }
                onPress={() => {
                  setError('');

                  setInfo(
                    'La recuperación de contraseña se implementará próximamente.',
                  );
                }}
              >
                <Text
                  style={
                    styles.forgotText
                  }
                >
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>
            ) : null}

            {error ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B6473E"
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {info ? (
              <View
                style={
                  styles.infoBox
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#39674F"
                />

                <Text
                  style={
                    styles.infoText
                  }
                >
                  {info}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              title={
                mode === 'login'
                  ? 'Ingresar'
                  : 'Crear mi cuenta'
              }
              loading={loading}
              onPress={
                mode === 'login'
                  ? submitLogin
                  : submitRegister
              }
            />

            {mode ===
            'register' ? (
              <Text
                style={
                  styles.terms
                }
              >
                Al crear una cuenta aceptas
                nuestros términos de uso y
                política de privacidad.
              </Text>
            ) : null}

            <View
              style={
                styles.securityFooter
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color="#547061"
              />

              <Text
                style={
                  styles.securityFooterText
                }
              >
                Tus datos y ubicaciones privadas
                están protegidos.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FormInput({
  icon,
  ...props
}: {
  icon: IconName;
} & ComponentProps<
  typeof TextInput
>) {
  return (
    <View
      style={
        styles.inputContainer
      }
    >
      <Ionicons
        name={icon}
        size={20}
        color="#66766D"
      />

      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#8B9890"
      />
    </View>
  );
}

function ModeButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.modeButton,
        active &&
          styles.modeButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modeText,

          active &&
            styles.modeTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function SocialButton({
  icon,
  title,
  onPress,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
}) {
  const scale =
    useRef(
      new Animated.Value(1),
    ).current;

  function pressIn() {
    Animated.spring(
      scale,
      {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 30,
      },
    ).start();
  }

  function pressOut() {
    Animated.spring(
      scale,
      {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 6,
      },
    ).start();
  }

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale,
          },
        ],
      }}
    >
      <Pressable
        style={
          styles.socialButton
        }
        onPress={onPress}
        onPressIn={
          pressIn
        }
        onPressOut={
          pressOut
        }
      >
        <Ionicons
          name={icon}
          size={22}
          color="#16392A"
        />

        <Text
          style={
            styles.socialButtonText
          }
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function PrimaryButton({
  title,
  loading,
  onPress,
}: {
  title: string;
  loading: boolean;
  onPress: () => void;
}) {
  const scale =
    useRef(
      new Animated.Value(1),
    ).current;

  function pressIn() {
    Animated.spring(
      scale,
      {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 30,
      },
    ).start();
  }

  function pressOut() {
    Animated.spring(
      scale,
      {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 7,
      },
    ).start();
  }

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale,
          },
        ],
      }}
    >
      <Pressable
        style={
          styles.primaryButton
        }
        disabled={
          loading
        }
        onPress={
          onPress
        }
        onPressIn={
          pressIn
        }
        onPressOut={
          pressOut
        }
      >
        {loading ? (
          <ActivityIndicator
            color="#10261C"
          />
        ) : (
          <>
            <Text
              style={
                styles.primaryButtonText
              }
            >
              {title}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#10261C"
            />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function HeroTag({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View
      style={
        styles.tag
      }
    >
      <Ionicons
        name={icon}
        size={16}
        color="#F3F6F4"
      />

      <Text
        style={
          styles.tagText
        }
      >
        {text}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor:
        '#071B13',
    },

    scroll: {
      flexGrow: 1,
      justifyContent:
        'center',
      padding: 24,
    },

    layout: {
      width: '100%',
      maxWidth: 1180,
      alignSelf:
        'center',
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 70,
    },

    layoutMobile: {
      flexDirection:
        'column',
      gap: 20,
    },

    hero: {
      flex: 1,
      paddingVertical: 30,
    },

    heroMobile: {
      width: '100%',
      paddingVertical: 10,
    },

    brandBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      alignSelf:
        'flex-start',
      gap: 8,
      backgroundColor:
        'rgba(8,32,23,0.78)',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginBottom: 22,
    },

    brandBadgeText: {
      color: '#D9A441',
      fontWeight:
        '900',
      letterSpacing: 1.6,
      fontSize: 12,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 55,
      lineHeight: 60,
      fontWeight:
        '900',
      maxWidth: 550,
    },

    heroDescription: {
      color: '#D5DFD9',
      fontSize: 17,
      lineHeight: 25,
      maxWidth: 500,
      marginTop: 18,
    },

    heroTags: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 9,
      marginTop: 24,
    },

    tag: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 6,
      backgroundColor:
        'rgba(255,255,255,0.12)',
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },

    tagText: {
      color: '#F5F7F5',
      fontWeight:
        '700',
      fontSize: 12,
    },

    privacyNote: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 11,
      marginTop: 35,
    },

    privacyIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        'rgba(255,255,255,0.10)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    privacyTitle: {
      color: '#F4F6F4',
      fontWeight:
        '800',
      fontSize: 13,
    },

    privacyText: {
      color: '#BBC9C0',
      fontSize: 12,
      marginTop: 3,
    },

    authCard: {
      width: '100%',
      maxWidth: 480,
      backgroundColor:
        'rgba(248,246,238,0.97)',
      borderRadius: 28,
      padding: 30,
      shadowColor:
        '#000000',
      shadowOpacity:
        0.22,
      shadowRadius: 30,
      shadowOffset: {
        width: 0,
        height: 15,
      },
    },

    mobileBrand: {
      color: '#A4652E',
      fontWeight:
        '900',
      letterSpacing:
        1.4,
      fontSize: 11,
      marginBottom: 7,
    },

    cardTitle: {
      color: '#15271E',
      fontSize: 27,
      fontWeight:
        '900',
    },

    cardSubtitle: {
      color: '#6C7A72',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
      marginBottom: 20,
    },

    modeSelector: {
      flexDirection:
        'row',
      backgroundColor:
        '#E6E9E4',
      borderRadius: 14,
      padding: 4,
      marginBottom: 18,
    },

    modeButton: {
      flex: 1,
      alignItems:
        'center',
      paddingVertical:
        10,
      borderRadius: 11,
    },

    modeButtonActive: {
      backgroundColor:
        '#FFFFFF',
      shadowColor:
        '#000000',
      shadowOpacity:
        0.05,
      shadowRadius: 5,
    },

    modeText: {
      color: '#758077',
      fontWeight:
        '800',
    },

    modeTextActive: {
      color: '#173B2B',
    },

    socialButton: {
      height: 52,
      borderWidth: 1,
      borderColor:
        '#D7DDD8',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 10,
      marginBottom: 10,
    },

    socialButtonText: {
      color: '#26372E',
      fontWeight:
        '800',
      fontSize: 14,
    },

    divider: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 10,
      marginVertical:
        14,
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor:
        '#DADFDA',
    },

    dividerText: {
      color: '#89938D',
      fontSize: 11,
    },

    inputContainer: {
      height: 54,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#D9DFDA',
      borderRadius: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        14,
      gap: 9,
      marginBottom: 11,
    },

    input: {
      flex: 1,
      height: '100%',
      color: '#1B2D23',
      fontSize: 15,
    },

    forgot: {
      alignSelf:
        'flex-end',
      marginBottom: 15,
    },

    forgotText: {
      color: '#9A632F',
      fontWeight:
        '800',
      fontSize: 12,
    },

    primaryButton: {
      height: 54,
      backgroundColor:
        '#D9A441',
      borderRadius: 14,
      flexDirection:
        'row',
      justifyContent:
        'center',
      alignItems:
        'center',
      gap: 8,
      marginTop: 3,
    },

    primaryButtonText: {
      color: '#10261C',
      fontWeight:
        '900',
      fontSize: 15,
    },

    errorBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
      backgroundColor:
        '#FBE8E5',
      padding: 10,
      borderRadius: 12,
      marginBottom: 10,
    },

    errorText: {
      flex: 1,
      color: '#9B3F38',
      fontSize: 12,
    },

    infoBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
      backgroundColor:
        '#E4EEE7',
      padding: 10,
      borderRadius: 12,
      marginBottom: 10,
    },

    infoText: {
      flex: 1,
      color: '#3C604E',
      fontSize: 12,
    },

    terms: {
      color: '#859088',
      fontSize: 10,
      textAlign:
        'center',
      lineHeight: 15,
      marginTop: 12,
    },

    securityFooter: {
      flexDirection:
        'row',
      justifyContent:
        'center',
      alignItems:
        'center',
      gap: 6,
      marginTop: 17,
    },

    securityFooterText: {
      color: '#66756D',
      fontSize: 11,
      textAlign:
        'center',
    },
  });
