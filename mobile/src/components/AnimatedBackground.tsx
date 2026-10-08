import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'soft' | 'normal';
};

export function AnimatedBackground({
  children,
  style,
  intensity = 'normal',
}: Props) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftA, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, {
          toValue: 1,
          duration: 15500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftB, {
          toValue: 0,
          duration: 15500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    a.start();
    b.start();
    p.start();

    return () => {
      a.stop();
      b.stop();
      p.stop();
    };
  }, [driftA, driftB, pulse]);

  const alpha = intensity === 'soft' ? 0.26 : 0.42;

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={['#041B22', '#062F3A', '#061F2A', '#031318']}
        locations={[0, 0.38, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBlue,
          {
            opacity: alpha,
            transform: [
              {
                translateX: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-45, 75],
                }),
              },
              {
                translateY: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-25, 55],
                }),
              },
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.08],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTeal,
          {
            opacity: alpha * 0.9,
            transform: [
              {
                translateX: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, -55],
                }),
              },
              {
                translateY: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [55, -45],
                }),
              },
            ],
          },
        ]}
      />

      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
  },
  orbBlue: {
    top: -155,
    right: -120,
    backgroundColor: '#0B88C9',
  },
  orbTeal: {
    bottom: -170,
    left: -115,
    backgroundColor: '#16A6A0',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 8, 12, 0.10)',
  },
});
