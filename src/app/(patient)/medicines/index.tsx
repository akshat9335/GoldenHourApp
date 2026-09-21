import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import {
  Screen,
  Card,
  Pill,
  Icon,
  TopBar,
  PatientNav,
  HTitle,
  LabelEyebrow,
  openExternalNavigation,
} from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface MedicineResult {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityLocation: { latitude: number; longitude: number };
  facilityPhone?: string;
  medicineName: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  price: number;
  distanceKm: number;
  etaMinutes: number;
}

const POPULAR_SEARCHES = [
  'Adrenaline',
  'Paracetamol',
  'Insulin',
  'Normal Saline',
  'Aspirin',
  'Atropine',
];

export default function PatientMedicineSearchScreen() {
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const userLat = lastKnownLocation?.latitude ?? 12.9352;
  const userLng = lastKnownLocation?.longitude ?? 77.6146;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicineResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOnlyInStock, setFilterOnlyInStock] = useState(false);

  const searchMedicines = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const res = await api.inventory.search(searchTerm, userLat, userLng, 40);
        const list = Array.isArray(res) ? res : res?.data || [];
        setResults(list);
      } catch (_err) {
        setResults([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userLat, userLng]
  );

  // Initial load with default emergency & essential medicines
  useEffect(() => {
    searchMedicines('');
  }, [searchMedicines]);

  const handleSearchSubmit = () => {
    searchMedicines(query);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    searchMedicines(query);
  };

  const displayedResults = filterOnlyInStock
    ? results.filter((r) => r.status === 'IN_STOCK')
    : results;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }
      >
        <TopBar title="Find Medicines Nearby" back />

        {/* Emergency Note Banner */}
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyBannerIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyBannerTitle}>Live Emergency & ER Stock</Text>
            <Text style={styles.emergencyBannerText}>
              Locate critical life-saving medications and 24/7 hospital pharmacies in real-time.
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine name (e.g. Adrenaline, Insulin)..."
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text.length === 0) searchMedicines('');
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery('');
                searchMedicines('');
              }}
              hitSlop={8}
            >
              <Icon name="close" size={16} color={colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>

        {/* Quick Tag Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickTagsScroll}
        >
          {POPULAR_SEARCHES.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => {
                setQuery(tag);
                searchMedicines(tag);
              }}
              style={[styles.tagPill, query.toLowerCase() === tag.toLowerCase() && styles.tagPillActive]}
            >
              <Text
                style={[
                  styles.tagPillText,
                  query.toLowerCase() === tag.toLowerCase() && styles.tagPillTextActive,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* In-Stock Toggle Filter */}
        <View style={styles.filterRow}>
          <LabelEyebrow>
            {displayedResults.length} {displayedResults.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
          </LabelEyebrow>

          <Pressable
            onPress={() => setFilterOnlyInStock((prev) => !prev)}
            style={[styles.stockToggle, filterOnlyInStock && styles.stockToggleActive]}
          >
            <Text style={[styles.stockToggleText, filterOnlyInStock && styles.stockToggleTextActive]}>
              {filterOnlyInStock ? '✓ In Stock Only' : 'Show All Stock'}
            </Text>
          </Pressable>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={{ fontSize: 12, color: colors.inkFaint, marginTop: 8 }}>
              Checking nearby pharmacies & hospital stock...
            </Text>
          </View>
        )}

        {/* Results List */}
        {!loading && displayedResults.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No facilities found</Text>
            <Text style={styles.emptySub}>
              {query
                ? `No nearby hospital or pharmacy has "${query}" listed in stock right now.`
                : 'Try searching for emergency drugs like Adrenaline, Atropine, or Paracetamol.'}
            </Text>
          </Card>
        ) : (
          displayedResults.map((item) => {
            const pillColor: 'success' | 'amber' | 'red' =
              item.status === 'IN_STOCK' ? 'success' : item.status === 'LOW_STOCK' ? 'amber' : 'red';
            const pillText =
              item.status === 'IN_STOCK'
                ? '🟢 In Stock'
                : item.status === 'LOW_STOCK'
                ? `🟡 Low Stock (${item.quantity} left)`
                : '🔴 Out of Stock';

            const phone = item.facilityPhone || '+91-80-2227-3100';

            return (
              <Card key={item.id} style={styles.resultCard}>
                <View style={styles.resultTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.facilityName}>{item.facilityName}</Text>
                    <Text style={styles.distanceText}>
                      📍 {item.distanceKm} km away · ~{item.etaMinutes} mins drive
                    </Text>
                  </View>
                  <Pill color={pillColor}>{pillText}</Pill>
                </View>

                <View style={styles.medicineDetailsBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medTitle}>{item.medicineName}</Text>
                    <Text style={styles.medCatText}>
                      {item.category.replace('_', ' ')} · ₹{item.price} / {item.unit}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.stockCountText}>{item.quantity} {item.unit}</Text>
                    <Text style={styles.availableLabel}>Available</Text>
                  </View>
                </View>

                {/* Action Buttons: Call Facility and Directions */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                    activeOpacity={0.8}
                  >
                    <Icon name="phone" size={15} color="#fff" />
                    <Text style={styles.callBtnText}>Call Facility</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() =>
                      openExternalNavigation({
                        destLat: item.facilityLocation?.latitude || 12.9716,
                        destLng: item.facilityLocation?.longitude || 77.5946,
                        destTitle: item.facilityName,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navBtnText}>🧭 Directions</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </Screen>
      <PatientNav active="" />
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 14,
  },
  emergencyBannerIcon: { fontSize: 24 },
  emergencyBannerTitle: { fontSize: 13.5, fontWeight: '700', color: colors.redDark },
  emergencyBannerText: { fontSize: 11, color: colors.inkSoft, marginTop: 2, lineHeight: 15 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.ink, paddingVertical: 0 },
  quickTagsScroll: { flexDirection: 'row', gap: 6, paddingBottom: 10 },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tagPillActive: { backgroundColor: colors.red, borderColor: colors.red },
  tagPillText: { fontSize: 11.5, fontWeight: '600', color: colors.ink },
  tagPillTextActive: { color: '#fff' },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  stockToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#F1F5F9',
  },
  stockToggleActive: { backgroundColor: '#DCFCE7' },
  stockToggleText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  stockToggleTextActive: { color: colors.success },
  emptyCard: { padding: 24, alignItems: 'center', marginVertical: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  resultCard: { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  facilityName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  distanceText: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2, fontWeight: '600' },
  medicineDetailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: 10,
    marginTop: 10,
  },
  medTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  medCatText: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  stockCountText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  availableLabel: { fontSize: 10, color: colors.inkFaint, fontWeight: '600' },
  actionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: radii.md,
    paddingVertical: 9,
  },
  callBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 9,
  },
  navBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
});
