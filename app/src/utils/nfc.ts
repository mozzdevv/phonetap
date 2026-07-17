// Web mock for NFC to prevent bundler crashes
export const NfcManager = {
  requestTechnology: async () => {},
  getTag: async () => null,
  cancelTechnologyRequest: async () => {},
  start: async () => {},
};

export const NfcTech = {
  Ndef: 'Ndef',
};

export const Ndef = {
  text: {
    decodePayload: () => '',
  }
};
