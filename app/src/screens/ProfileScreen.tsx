// PhoneTap — Profile Screen
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getUser, getVideosByOwner, getConnectionCount, VideoRecord, LocalUser } from '../services/storage';
import { COLORS, SPACING, RADIUS } from '../utils/constants';

const { width } = Dimensions.get('window');
const GRID_GAP = 4;
const GRID_COLS = 3;
const TILE_SIZE = (width - GRID_GAP * (GRID_COLS + 1)) / GRID_COLS;

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [connCount, setConnCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const u = await getUser();
        setUser(u);
        if (u) {
          const vids = await getVideosByOwner(u.signPublicKey);
          setVideos(vids);
        }
        const count = await getConnectionCount();
        setConnCount(count);
      })();
    }, [])
  );

  const renderVideoTile = ({ item }: { item: VideoRecord }) => (
    <TouchableOpacity style={styles.videoTile} activeOpacity={0.8}>
      <View style={styles.tilePlaceholder}>
        <Ionicons name="play" size={20} color={COLORS.text} />
      </View>
      <Text style={styles.tileDuration}>
        {item.durationMs ? `${Math.round(item.durationMs / 1000)}s` : '30s'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarLetter}>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        </View>

        <Text style={styles.displayName}>{user?.displayName || user?.username}</Text>
        <Text style={styles.username}>@{user?.username}</Text>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('Connections')}
          >
            <Text style={styles.statNumber}>{connCount}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{videos.length}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Record')}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Ionicons name="videocam" size={18} color={COLORS.text} />
            <Text style={styles.actionText}>Record</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Connect')}
        >
          <View style={styles.actionOutline}>
            <Ionicons name="hand-left" size={18} color={COLORS.primaryLight} />
            <Text style={[styles.actionText, { color: COLORS.primaryLight }]}>Connect</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Video grid */}
      {videos.length === 0 ? (
        <View style={styles.emptyGrid}>
          <Ionicons name="videocam-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No videos yet</Text>
          <Text style={styles.emptySubtext}>Record your first 30-second moment</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderVideoTile}
          numColumns={GRID_COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
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
  settingsButton: { padding: SPACING.sm },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  username: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.xl,
  },
  stat: { alignItems: 'center' },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionOutline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  grid: {
    paddingHorizontal: GRID_GAP,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  videoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tilePlaceholder: {
    opacity: 0.5,
  },
  tileDuration: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
