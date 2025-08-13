import { colors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View
} from "react-native";

const { width, height } = Dimensions.get("window");
const PARTICLE_COUNT = 20;

const Index = () => {
  const router = useRouter();

  // Main animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // Particles
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Logo animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle animations
    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 6000 + Math.random() * 4000,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(() => loop());
      };
      loop();
    });

    const timer = setTimeout(async () => {
      try {
        const user = await AsyncStorage.getItem("user");
        if (user) {
          // User exists — redirect to login or main screen
          router.replace("/(auth)/login");
        } else {
          // No user — redirect to register or welcome
          router.replace("/(auth)/register");
        }
      } catch (e) {
        // fallback
        router.replace("/(auth)/welcome");
      }
    }, 3200);
  
    return () => clearTimeout(timer);
  }, []);

  // Interpolations
  const glowSize = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [220, 260],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const particleGlow = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1], // particle brightness changes with glow
  });

  return (
    <View style={styles.container}>
      {/* Particles */}
      {particles.map((p, index) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [p.y, p.y - 50 - Math.random() * 30],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.8, 0],
        });

        return (
          <Animated.View
            key={index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: "white",
              transform: [{ translateX: p.x }, { translateY }],
              opacity: Animated.multiply(opacity, particleGlow),
            }}
          />
        );
      })}

      {/* Glow */}
      <Animated.View
        style={[
          styles.glow,
          { width: glowSize, height: glowSize },
        ]}
      />

      {/* Ring */}
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ringScale }] },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <Image
          style={styles.logo}
          resizeMode="contain"
          source={require("../assets/images/splash.png")}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineFade,
            transform: [
              {
                translateY: taglineFade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        Your money, your control
      </Animated.Text>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral900,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  ring: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  logo: {
    height: 140,
    width: 140,
    marginBottom: 20,
  },
  tagline: {
    color: colors.textLight,
    fontSize: 16,
    letterSpacing: 0.5,
    opacity: 0.85,
    marginTop: 12,
  },
});
