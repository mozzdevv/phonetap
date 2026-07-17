// PhoneTap — Welcome Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, APP_NAME, APP_TAGLINE } from '../utils/constants';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.background, '#0F0A1F', COLORS.background]}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbCyan]} />

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="finger-print" size={48} color={COLORS.text} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>

          {/* Features */}
          <View style={styles.features}>
            <FeatureRow icon="videocam" text="Share 30-second moments" />
            <FeatureRow icon="phone-portrait" text="Connect by tapping phones" />
            <FeatureRow icon="lock-closed" text="End-to-end encrypted" />
            <FeatureRow icon="people" text="Real connections only" />
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('ProfileSetup')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            No email. No phone number. Just you.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primaryLight} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  orbPurple: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.primary,
    top: -50,
    right: -100,
  },
  orbCyan: {
    width: 250,
    height: 250,
    backgroundColor: COLORS.secondary,
    bottom: 100,
    left: -80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  features: {
    marginTop: SPACING.xxl,
    width: '100%',
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    flex: 1,
  },
  ctaButton: {
    marginTop: SPACING.xxl,
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: SPACING.sm,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  footerText: {
    marginTop: SPACING.lg,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
