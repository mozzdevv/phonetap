// PhoneTap — Video Record Screen (30s max)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, MAX_VIDEO_DURATION_SEC } from '../utils/constants';

const { width } = Dimensions.get('window');

export default function RecordScreen({ navigation }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev >= MAX_VIDEO_DURATION_SEC - 1) {
          stopRecording();
          return MAX_VIDEO_DURATION_SEC;
        }
        return prev + 1;
      });
    }, 1000);
    // TODO: Start actual camera recording with react-native-vision-camera
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHasRecording(true);
    // TODO: Stop camera recording, get video URI
  };

  const handleUpload = () => {
    // TODO: Upload video via api.uploadVideo()
    Alert.alert('Posted!', 'Your video has been shared with your connections.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handleDiscard = () => {
    setHasRecording(false);
    setSeconds(0);
  };

  const progress = seconds / MAX_VIDEO_DURATION_SEC;

  return (
    <View style={styles.container}>
      {/* Camera preview placeholder */}
      <View style={styles.cameraPreview}>
        <Ionicons name="videocam" size={64} color={COLORS.textMuted} />
        <Text style={styles.cameraText}>Camera Preview</Text>
      </View>

      {/* Timer bar */}
      <View style={styles.timerBar}>
        <View style={[styles.timerFill, { width: `${progress * 100}%` }]}>
          <LinearGradient
            colors={[COLORS.primary, seconds > 25 ? COLORS.error : COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      </View>

      {/* Timer text */}
      <Text style={styles.timerText}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:
        {String(seconds % 60).padStart(2, '0')}
        <Text style={styles.timerMax}> / 0:{MAX_VIDEO_DURATION_SEC}</Text>
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>

        {/* Record button */}
        {!hasRecording ? (
          <TouchableOpacity
            style={[styles.recordOuter, isRecording && styles.recordOuterActive]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.7}
          >
            <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
          </TouchableOpacity>
        ) : (
          <View style={styles.postControls}>
            <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
              <Ionicons name="trash" size={24} color={COLORS.error} />
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postButton} onPress={handleUpload}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.postGradient}
              >
                <Ionicons name="cloud-upload" size={24} color={COLORS.text} />
                <Text style={styles.postText}>Post</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Flip camera */}
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="camera-reverse" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    margin: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cameraText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  timerBar: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: SPACING.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerText: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    fontVariant: ['tabular-nums'],
  },
  timerMax: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordOuterActive: {
    borderColor: COLORS.error,
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  postControls: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
  },
  discardText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  postButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  postGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  postText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
