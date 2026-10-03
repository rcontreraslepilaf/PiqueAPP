import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../components/AnimatedBackground';

export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const rise = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, scale]);

  return (
    <AnimatedBackground>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: fade,
              transform: [{ scale }, { translateY: rise }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Ionicons name="fish" size={54} color="#48B8FF" />
          </View>
          <Text style={styles.brand}>PiqueAPP</Text>
          <Text style={styles.tagline}>PESCA · OUTDOOR · COMUNIDAD</Text>
        </Animated.View>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, { opacity: fade }]} />
        </View>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 34,
    backgroundColor: 'rgba(8, 42, 55, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(100, 205, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#23A9F4',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  brand: {
    marginTop: 22,
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  tagline: {
    marginTop: 6,
    color: '#7ED0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  loaderTrack: {
    position: 'absolute',
    bottom: 72,
    width: 190,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  loaderFill: {
    width: '72%',
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#35AFFF',
  },
});
