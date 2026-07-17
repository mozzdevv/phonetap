// PhoneTap — Chat Screen (E2E Encrypted DMs)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { decodeBase64 } from 'tweetnacl-util';
import { encryptMessage, decryptMessage } from '../services/crypto';
import { getUser, getMessages, saveMessage, MessageRecord, removeConnection as localRemoveConnection } from '../services/storage';
import { sendEncryptedMessage, removeConnection as apiRemoveConnection } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../utils/constants';
import { Alert } from 'react-native';

interface ChatMessage {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
}

export default function ChatScreen({ route, navigation }: any) {
  const { publicKey, username } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    const user = await getUser();
    if (!user) return;

    const records = await getMessages(publicKey);
    const decrypted: ChatMessage[] = [];

    for (const rec of records) {
      try {
        const senderPubKey = rec.isMine
          ? decodeBase64(publicKey) // recipient's box key for decryption
          : decodeBase64(rec.senderKey);
        const text = decryptMessage(
          rec.encryptedContent,
          rec.nonce,
          senderPubKey,
          decodeBase64(user.boxSecretKey)
        );
        decrypted.push({
          id: rec.createdAt + rec.nonce,
          text,
          isMine: rec.isMine,
          time: formatTime(rec.createdAt),
        });
      } catch {
        decrypted.push({
          id: rec.createdAt + rec.nonce,
          text: '🔒 Unable to decrypt',
          isMine: rec.isMine,
          time: formatTime(rec.createdAt),
        });
      }
    }
    setMessages(decrypted);
  }, [publicKey]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);

    const user = await getUser();
    if (!user) return;

    try {
      const recipientBoxKey = decodeBase64(publicKey); // This should be the boxPublicKey from the connection
      const senderSecretKey = decodeBase64(user.boxSecretKey);

      const { ciphertext, nonce } = encryptMessage(
        inputText.trim(),
        recipientBoxKey,
        senderSecretKey
      );

      // Save locally
      await saveMessage({
        conversationKey: publicKey,
        senderKey: user.boxPublicKey,
        encryptedContent: ciphertext,
        nonce,
        isMine: true,
        createdAt: new Date().toISOString(),
      });

      // Send to server for relay
      try {
        await sendEncryptedMessage(publicKey, ciphertext, nonce);
      } catch {}

      setInputText('');
      await loadMessages();
      flatListRef.current?.scrollToEnd();
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.msgRow, item.isMine && styles.msgRowMine]}>
      <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.msgText, item.isMine && styles.msgTextMine]}>
          {item.text}
        </Text>
        <Text style={[styles.msgTime, item.isMine && styles.msgTimeMine]}>
          {item.time}
        </Text>
      </View>
    </View>
  );

  const handleUnfriend = () => {
    Alert.alert(
      'Unfriend',
      `Are you sure you want to unfriend @${username}? This will delete all messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unfriend', 
          style: 'destructive',
          onPress: async () => {
            try {
              await localRemoveConnection(publicKey);
              apiRemoveConnection(publicKey).catch(console.warn);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Could not unfriend');
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>@{username}</Text>
          <View style={styles.encryptedBadge}>
            <Ionicons name="lock-closed" size={10} color={COLORS.success} />
            <Text style={styles.encryptedText}>Encrypted</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleUnfriend} style={styles.optionsBtn}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.success} />
            <Text style={styles.emptyChatTitle}>E2E Encrypted</Text>
            <Text style={styles.emptyChatText}>
              Messages are encrypted with NaCl box.{'\n'}
              Not even PhoneTap can read them.
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <LinearGradient
            colors={inputText.trim() ? [COLORS.primary, COLORS.secondary] : [COLORS.surfaceLight, COLORS.surfaceLight]}
            style={styles.sendGradient}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? COLORS.text : COLORS.textMuted}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: { width: 40 },
  optionsBtn: { width: 40, alignItems: 'flex-end' },
  headerInfo: { alignItems: 'center' },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  encryptedText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  messageList: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  bubbleTheirs: {
    backgroundColor: COLORS.surfaceLight,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  msgTextMine: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMine: {
    color: 'rgba(255,255,255,0.6)',
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.xl,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  sendDisabled: { opacity: 0.5 },
  sendGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
