// PhoneTap — Chat List Screen (DM Conversations)
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations } from '../services/storage';
import { COLORS, SPACING, RADIUS } from '../utils/constants';

interface ConversationItem {
  key: string;
  username: string;
  lastMessage: string;
}

export default function ChatListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const convs = await getConversations();
        setConversations(convs);
      })();
    }, [])
  );

  const renderConversation = ({ item }: { item: ConversationItem }) => (
    <TouchableOpacity
      style={styles.convCard}
      onPress={() => navigation.navigate('Chat', {
        publicKey: item.key,
        username: item.username,
      })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarLetter}>
            {item.username[0]?.toUpperCase()}
          </Text>
        </LinearGradient>
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convUsername}>@{item.username}</Text>
        <View style={styles.lastMsgRow}>
          <Ionicons name="lock-closed" size={11} color={COLORS.success} />
          <Text style={styles.lastMsg} numberOfLines={1}>Encrypted message</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.e2eBadge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
          <Text style={styles.e2eText}>E2E Encrypted</Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Connect with someone first, then start a conversation
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.key}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 60,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  e2eBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.success + '15',
    borderRadius: RADIUS.full,
  },
  e2eText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  convInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  convUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  lastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  lastMsg: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
