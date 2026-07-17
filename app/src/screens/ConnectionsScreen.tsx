// PhoneTap — Connections Screen (Followers/Following)
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
import { getConnections, Connection } from '../services/storage';
import { COLORS, SPACING, RADIUS } from '../utils/constants';

export default function ConnectionsScreen({ navigation }: any) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'top10'>('new');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const conns = await getConnections();
        setConnections(conns);
      })();
    }, [])
  );

  const displayedConnections = connections
    .sort((a, b) => {
      if (activeTab === 'new') {
        return new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime();
      } else {
        return (b.tapCount || 1) - (a.tapCount || 1);
      }
    })
    .slice(0, activeTab === 'top10' ? 10 : undefined);

  const renderConnection = ({ item }: { item: Connection }) => (
    <TouchableOpacity
      style={styles.connectionCard}
      onPress={() => navigation.navigate('Chat', {
        publicKey: item.publicKey,
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
      <View style={styles.connInfo}>
        <Text style={styles.connUsername}>@{item.username}</Text>
        <Text style={styles.connDate}>
          {activeTab === 'new' ? `Connected ${formatDate(item.connectedAt)}` : `${item.tapCount || 1} Tap-In${(item.tapCount || 1) !== 1 ? 's' : ''}`}
        </Text>
      </View>
      <TouchableOpacity style={styles.messageButton}>
        <Ionicons name="chatbubble-outline" size={20} color={COLORS.primaryLight} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            New Tap-Ins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'top10' && styles.activeTab]}
          onPress={() => setActiveTab('top10')}
        >
          <Text style={[styles.tabText, activeTab === 'top10' && styles.activeTabText]}>
            Top 10
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {displayedConnections.length} connection{displayedConnections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {connections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No connections yet</Text>
          <Text style={styles.emptySubtext}>
            Tap phones or scan QR codes to connect
          </Text>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => navigation.navigate('Connect')}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.connectGradient}
            >
              <Text style={styles.connectText}>Find People</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedConnections}
          keyExtractor={(item) => item.publicKey}
          renderItem={renderConnection}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  backBtn: { width: 40 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.surfaceLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.text,
  },
  countBadge: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  countText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  connectionCard: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  connInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  connUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  connDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  messageButton: {
    padding: SPACING.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  connectBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  connectGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
  },
  connectText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
