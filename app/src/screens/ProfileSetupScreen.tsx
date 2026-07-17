// PhoneTap — Profile Setup Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { generateKeyPairs, serializeKeys } from '../services/crypto';
import { saveUser } from '../services/storage';
import { registerUser } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../utils/constants';

export default function ProfileSetupScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      Alert.alert('Username too short', 'Must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      Alert.alert('Invalid username', 'Only lowercase letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      // Generate cryptographic identity
      const keys = generateKeyPairs();
      const serialized = serializeKeys(keys);

      // Save locally
      await saveUser({
        username: trimmed,
        displayName: displayName.trim() || undefined,
        signPublicKey: serialized.signPublicKey,
        signSecretKey: serialized.signSecretKey,
        boxPublicKey: serialized.boxPublicKey,
        boxSecretKey: serialized.boxSecretKey,
        isVerified: true,
      });

      // Register on server (best-effort — works offline too)
      try {
        await registerUser(trimmed, serialized.signPublicKey, serialized.boxPublicKey);
      } catch {
        // Server registration can be retried later
      }

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[COLORS.background, '#0F0A1F', COLORS.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.stepLabel}>CREATE YOUR IDENTITY</Text>
          <Text style={styles.title}>Who Are You?</Text>
          <Text style={styles.subtitle}>
            Your identity is cryptographic.{'\n'}No email or phone needed.
          </Text>

          {/* Avatar placeholder */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={48} color={COLORS.primaryLight} />
          </View>

          {/* Username input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="yourname"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            </View>
          </View>

          {/* Display name input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputFull]}
              placeholder="How you want to be seen"
              placeholderTextColor={COLORS.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
            />
          </View>

          {/* Create button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createGradient}
            >
              <Text style={styles.createText}>
                {loading ? 'Creating...' : 'Create Identity'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
            <Text style={styles.securityText}>
              Your keys never leave this device
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputPrefix: {
    fontSize: 18,
    color: COLORS.primaryLight,
    paddingLeft: SPACING.md,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 16,
    paddingHorizontal: SPACING.sm,
  },
  inputFull: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  createButton: {
    marginTop: SPACING.lg,
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonDisabled: { opacity: 0.6 },
  createGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  createText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  securityText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
