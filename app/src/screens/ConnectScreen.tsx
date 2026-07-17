// PhoneTap — Connect Screen (NFC + Rotating QR)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getUser, addConnection } from '../services/storage';
import { generateQRPayload, validateQRPayload } from '../services/crypto';
import { registerConnection } from '../services/api';
import { decodeBase64 } from 'tweetnacl-util';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Platform } from 'react-native';
import { NfcManager, NfcTech, Ndef } from '../utils/nfc';
import { COLORS, SPACING, RADIUS, QR_TTL_MS, WS_URL } from '../utils/constants';

const { width } = Dimensions.get('window');

type ConnectMode = 'choose' | 'nfc' | 'qr-show' | 'qr-scan';

export default function ConnectScreen({ navigation }: any) {
  const [mode, setMode] = useState<ConnectMode>('choose');
  const [qrData, setQrData] = useState('');
  const [qrCountdown, setQrCountdown] = useState(2);
  const [nfcActive, setNfcActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const usedNonces = useRef(new Set<string>());
  const qrInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate rotating QR codes
  const startQRRotation = useCallback(async () => {
    const user = await getUser();
    if (!user) return;

    const generateNewQR = () => {
      const payload = generateQRPayload(
        user.signPublicKey,
        user.username,
        user.boxPublicKey,
        decodeBase64(user.signSecretKey),
        QR_TTL_MS
      );
      setQrData(payload);
      setQrCountdown(2);
    };

    generateNewQR();
    qrInterval.current = setInterval(generateNewQR, QR_TTL_MS);

    // Countdown animation
    const countdownInterval = setInterval(() => {
      setQrCountdown(prev => (prev <= 0.1 ? 2 : prev - 0.1));
    }, 100);

    return () => {
      if (qrInterval.current) clearInterval(qrInterval.current);
      clearInterval(countdownInterval);
    };
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;

    if (mode === 'qr-show') {
      const cleanup = startQRRotation();

      // Listen for new connections in real-time
      (async () => {
        const user = await getUser();
        if (!user) return;
        ws = new WebSocket(`${WS_URL}?publicKey=${encodeURIComponent(user.signPublicKey)}`);
        ws.onmessage = async (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'new_connection') {
              await addConnection({
                publicKey: data.publicKey,
                boxPublicKey: data.boxPublicKey,
                username: data.username,
                connectedAt: new Date().toISOString(),
              });
              Alert.alert('New Connection! 🎉', `@${data.username} just scanned your code!`);
            }
          } catch {}
        };
      })();

      return () => { 
        cleanup.then(fn => fn?.()); 
        if (ws) ws.close();
      };
    }
    return () => {
      if (qrInterval.current) clearInterval(qrInterval.current);
    };
  }, [mode, startQRRotation]);

  const handleScannedData = async (scannedData: string) => {
    if (scanned) return;
    setScanned(true);

    const result = validateQRPayload(scannedData, usedNonces.current);
    if (!result.valid || !result.data) {
      Alert.alert('Invalid Code', result.error || 'Could not read payload', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
      return;
    }

    const { publicKey, username, boxPublicKey } = result.data;
    await addConnection({
      publicKey,
      boxPublicKey,
      username,
      connectedAt: new Date().toISOString(),
    });

    try {
      await registerConnection(publicKey);
    } catch {}

    Alert.alert('Connected! 🎉', `You're now connected with @${username}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const startNFC = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'NFC is not supported on web browsers. Please use the QR Code options to connect for testing!');
      setMode('choose');
      return;
    }

    setNfcActive(true);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        const ndefRecord = tag.ndefMessage[0];
        const payloadText = Ndef.text.decodePayload(new Uint8Array(ndefRecord.payload as number[]));
        await handleScannedData(payloadText);
      } else {
        Alert.alert('NFC', 'No readable data found on this tag.');
      }
    } catch (ex) {
      console.warn('NFC read error:', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
      setMode('choose');
      setNfcActive(false);
    }
  };

  const renderChoose = () => (
    <View style={styles.chooseContainer}>
      <Text style={styles.chooseTitle}>Connect</Text>
      <Text style={styles.chooseSubtitle}>
        Choose how to connect with someone nearby
      </Text>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => { setMode('nfc'); startNFC(); }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary + '20', COLORS.primary + '05']}
          style={styles.optionGradient}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="phone-portrait" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>NFC Tap</Text>
            <Text style={styles.optionDesc}>
              Hold phones back-to-back
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setMode('qr-show')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.secondary + '20', COLORS.secondary + '05']}
          style={styles.optionGradient}
        >
          <View style={[styles.optionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
            <Ionicons name="qr-code" size={32} color={COLORS.secondary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Show QR Code</Text>
            <Text style={styles.optionDesc}>
              Let someone scan your code
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setMode('qr-scan')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.accent + '20', COLORS.accent + '05']}
          style={styles.optionGradient}
        >
          <View style={[styles.optionIcon, { backgroundColor: COLORS.accent + '20' }]}>
            <Ionicons name="scan" size={32} color={COLORS.accent} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Scan QR Code</Text>
            <Text style={styles.optionDesc}>
              Scan someone's code to connect
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderQRShow = () => (
    <View style={styles.qrContainer}>
      <Text style={styles.qrTitle}>Your QR Code</Text>
      <Text style={styles.qrSubtitle}>
        Ask your new connection to scan this code
      </Text>

      {/* QR Code */}
      <View style={styles.qrBox}>
        <View style={styles.qrPlaceholder}>
          {qrData ? (
            <QRCode value={qrData} size={200} backgroundColor="#FFFFFF" color="#0A0A1A" />
          ) : (
            <Ionicons name="qr-code" size={120} color={COLORS.primary} />
          )}
        </View>

        {/* Countdown ring */}
        <View style={styles.countdownRow}>
          <View style={styles.countdownBar}>
            <View
              style={[
                styles.countdownFill,
                { width: `${(qrCountdown / 2) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.countdownText}>
            Refreshes in {qrCountdown.toFixed(1)}s
          </Text>
        </View>
      </View>

      <View style={styles.securityRow}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
        <Text style={styles.securityText}>
          Code expires every 2 seconds — screenshots won't work
        </Text>
      </View>
    </View>
  );

  const renderQRScan = () => {
    if (!cameraPermission) {
      return <View style={styles.scanContainer} />;
    }
    if (!cameraPermission.granted) {
      return (
        <View style={styles.scanContainer}>
          <Text style={styles.qrSubtitle}>We need access to your camera to scan codes.</Text>
          <TouchableOpacity style={{ padding: 12, backgroundColor: COLORS.primary, borderRadius: RADIUS.md }} onPress={requestCameraPermission}>
             <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : ({ data }) => handleScannedData(data)}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scanOverlay}>
          <Text style={styles.scanOverlayTitle}>Scan QR Code</Text>
          <View style={styles.scanPreviewFrame} />
        </View>
      </View>
    );
  };

  const renderNFC = () => (
    <View style={styles.nfcContainer}>
      <Text style={styles.qrTitle}>NFC Tap</Text>
      <View style={styles.nfcAnimation}>
        <View style={styles.nfcPhone}>
          <Ionicons name="phone-portrait" size={64} color={COLORS.primary} />
        </View>
        <View style={styles.nfcWaves}>
          <Ionicons name="wifi" size={32} color={COLORS.primaryLight} />
        </View>
        <View style={styles.nfcPhone}>
          <Ionicons name="phone-portrait" size={64} color={COLORS.secondary} />
        </View>
      </View>
      <Text style={styles.nfcInstructions}>
        Hold phones back-to-back{'\n'}until you feel a vibration
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => mode === 'choose' ? navigation.goBack() : setMode('choose')}
      >
        <Ionicons
          name={mode === 'choose' ? 'close' : 'arrow-back'}
          size={24}
          color={COLORS.text}
        />
      </TouchableOpacity>

      {mode === 'choose' && renderChoose()}
      {mode === 'qr-show' && renderQRShow()}
      {mode === 'qr-scan' && renderQRScan()}
      {mode === 'nfc' && renderNFC()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chooseContainer: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: SPACING.lg,
  },
  chooseTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  chooseSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  optionCard: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  qrTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  qrSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  qrBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: width - 80,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
  },
  qrDataPreview: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  countdownRow: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  countdownBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  scanPreview: {
    width: width - 80,
    height: width - 80,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  scanText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  nfcContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  nfcAnimation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  nfcPhone: {
    padding: SPACING.md,
  },
  nfcWaves: {
    opacity: 0.5,
  },
  nfcInstructions: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanOverlayTitle: {
    position: 'absolute',
    top: 100,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scanPreviewFrame: {
    width: width - 80,
    height: width - 80,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
  },
});
