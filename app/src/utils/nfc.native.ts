import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// Initialize NFC on native platforms
NfcManager.start().catch(() => {
  console.warn('NFC Manager failed to start or is unsupported on this device.');
});

export { NfcManager, NfcTech, Ndef };
