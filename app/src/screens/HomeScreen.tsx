// PhoneTap — Home Feed Screen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getConnections, getFeedVideos, VideoRecord, getUser } from '../services/storage';
import { COLORS, SPACING, RADIUS, APP_NAME } from '../utils/constants';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const loadFeed = useCallback(async () => {
    const conns = await getConnections();
    setConnectionCount(conns.length);
    const feed = await getFeedVideos();
    setVideos(feed);
    setIsEmpty(feed.length === 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="phone-portrait-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        {connectionCount === 0
          ? 'Tap phones with someone to connect and see their posts'
          : 'Your connections haven\'t posted yet. Be the first!'}
      </Text>
      <TouchableOpacity
        style={styles.emptyAction}
        onPress={() => navigation.navigate('Connect')}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyActionGradient}
        >
          <Ionicons name="hand-left" size={20} color={COLORS.text} />
          <Text style={styles.emptyActionText}>Connect Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderVideoCard = ({ item }: { item: VideoRecord }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoPlaceholder}>
        <Ionicons name="play-circle" size={48} color={COLORS.primaryLight} />
        <Text style={styles.videoDuration}>
          {item.durationMs ? `${Math.round(item.durationMs / 1000)}s` : '30s'}
        </Text>
      </View>
      <View style={styles.videoMeta}>
        <View style={styles.videoUser}>
          <View style={styles.videoAvatar}>
            <Ionicons name="person" size={16} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.videoUsername} numberOfLines={1}>
            {item.ownerPublicKey.substring(0, 12)}...
          </Text>
        </View>
        <Text style={styles.videoTime}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{APP_NAME}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Connect')}
          >
            <Ionicons name="hand-left" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Record')}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.recordButton}
            >
              <Ionicons name="add" size={22} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection count badge */}
      <View style={styles.connBadge}>
        <Ionicons name="people" size={14} color={COLORS.secondary} />
        <Text style={styles.connBadgeText}>
          {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Feed */}
      {isEmpty ? (
        renderEmpty()
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderVideoCard}
          contentContainerStyle={styles.feedList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  recordButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  connBadgeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  feedList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  videoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoPlaceholder: {
    width: '100%',
    height: width * 0.75,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  videoUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  videoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: 150,
  },
  videoTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyContainer: {
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  emptyAction: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
