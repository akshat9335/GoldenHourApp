import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import { Screen, Card, Pill, Icon, TopBar, HospitalNav, HTitle, LabelEyebrow, Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface InventoryItem {
  id: string;
  facilityId: string;
  facilityName: string;
  medicineName: string;
  category: 'TABLET' | 'INJECTION' | 'SYRUP' | 'IV_FLUID' | 'EMERGENCY_DRUG';
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  price: number;
  lastUpdated: string;
  batchNumber?: string;
  expiryDate?: string;
}

const CATEGORIES = ['ALL', 'EMERGENCY_DRUG', 'TABLET', 'INJECTION', 'IV_FLUID', 'SYRUP'] as const;

export default function HospitalInventoryScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const facilityId = userProfile?.hospitalId || userProfile?.uid || 'hosp-martha-blr';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal State for Add Medicine
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedCategory, setNewMedCategory] = useState<InventoryItem['category']>('TABLET');
  const [newMedQuantity, setNewMedQuantity] = useState('50');
  const [newMedUnit, setNewMedUnit] = useState('Strips');
  const [newMedThreshold, setNewMedThreshold] = useState('20');
  const [newMedPrice, setNewMedPrice] = useState('100');
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.inventory.getByFacility(facilityId);
      const list = Array.isArray(res) ? res : res?.data || [];
      setItems(list);
    } catch (err: any) {
      // fallback handled gracefully by backend service
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  // Quick adjust quantity (+ or -)
  const adjustQuantity = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    const newStatus: InventoryItem['status'] =
      newQty === 0 ? 'OUT_OF_STOCK' : newQty <= item.lowStockThreshold ? 'LOW_STOCK' : 'IN_STOCK';

    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, quantity: newQty, status: newStatus } : it
      )
    );

    setUpdatingId(item.id);
    try {
      await api.inventory.updateStock(item.id, newQty, item.lowStockThreshold, item.price, facilityId);
    } catch (err: any) {
      // Revert on error
      fetchInventory();
      Alert.alert('Update Failed', err?.message || 'Unable to update stock quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedName.trim()) {
      Alert.alert('Required Field', 'Please enter a medicine name.');
      return;
    }

    setAddingSubmitting(true);
    try {
      await api.inventory.addItem({
        facilityId,
        facilityName: userProfile?.hospitalName || 'Hospital Pharmacy',
        medicineName: newMedName.trim(),
        category: newMedCategory,
        quantity: Number(newMedQuantity) || 0,
        unit: newMedUnit.trim() || 'Units',
        lowStockThreshold: Number(newMedThreshold) || 20,
        price: Number(newMedPrice) || 0,
      });

      setShowAddModal(false);
      setNewMedName('');
      setNewMedQuantity('50');
      fetchInventory();
      Alert.alert('Success', `${newMedName} added to facility inventory.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add medicine item.');
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Computed filtered list
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !searchQuery.trim() ||
        it.medicineName.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesCat =
        selectedCategory === 'ALL' || it.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory]);

  const summary = useMemo(() => {
    const total = items.length;
    const inStock = items.filter((i) => i.status === 'IN_STOCK').length;
    const lowStock = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    return { total, inStock, lowStock, outStock };
  }, [items]);

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
        <TopBar title="Hospital Inventory & Stock" back />

        {/* Summary KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, { borderColor: '#BBF7D0' }]}>
            <Text style={[styles.kpiNum, { color: colors.success }]}>{summary.inStock}</Text>
            <Text style={styles.kpiLabel}>IN STOCK</Text>
          </Card>
          <Card style={[styles.kpiCard, { borderColor: '#FDE68A' }]}>
            <Text style={[styles.kpiNum, { color: colors.amber }]}>{summary.lowStock}</Text>
            <Text style={styles.kpiLabel}>LOW STOCK</Text>
          </Card>
          <Card style={[styles.kpiCard, { borderColor: '#FECACA' }]}>
            <Text style={[styles.kpiNum, { color: colors.red }]}>{summary.outStock}</Text>
            <Text style={styles.kpiLabel}>OUT OF STOCK</Text>
          </Card>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine (e.g. Paracetamol, Adrenaline)..."
            placeholderTextColor={colors.inkFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Icon name="close" size={16} color={colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat;
            const label =
              cat === 'ALL'
                ? 'All Stock'
                : cat === 'EMERGENCY_DRUG'
                ? '🚨 Emergency'
                : cat === 'IV_FLUID'
                ? '💧 IV Fluids'
                : cat.charAt(0) + cat.slice(1).toLowerCase() + 's';
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterChip, isSel && styles.filterChipSelected]}
              >
                <Text style={[styles.filterChipText, isSel && styles.filterChipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Add New Stock Action Button */}
        <View style={{ marginVertical: 12 }}>
          <Button
            title="+ Add New Medicine to Stock"
            variant="secondary"
            onPress={() => setShowAddModal(true)}
          />
        </View>

        {/* Inventory List */}
        <LabelEyebrow>
          INVENTORY LIST ({filteredItems.length} {filteredItems.length === 1 ? 'ITEM' : 'ITEMS'})
        </LabelEyebrow>

        {filteredItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? `No matches for "${searchQuery}".` : 'No inventory items in this category.'}
            </Text>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const pillColor: 'success' | 'amber' | 'red' =
              item.status === 'IN_STOCK' ? 'success' : item.status === 'LOW_STOCK' ? 'amber' : 'red';
            const pillText =
              item.status === 'IN_STOCK'
                ? '🟢 In Stock'
                : item.status === 'LOW_STOCK'
                ? '🟡 Low Stock (<30)'
                : '🔴 Out of Stock';

            const isUpdating = updatingId === item.id;

            return (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.medName}>{item.medicineName}</Text>
                    <Text style={styles.medCategory}>
                      {item.category.replace('_', ' ')} · ₹{item.price} / {item.unit}
                    </Text>
                  </View>
                  <Pill color={pillColor}>{pillText}</Pill>
                </View>

                <View style={styles.itemBottomRow}>
                  <View>
                    <Text style={styles.qtyNumber}>
                      {item.quantity} <Text style={styles.unitText}>{item.unit}</Text>
                    </Text>
                    <Text style={styles.thresholdText}>
                      Alert threshold: {item.lowStockThreshold} {item.unit}
                    </Text>
                  </View>

                  {/* Quick Adjust Buttons */}
                  <View style={styles.adjustRow}>
                    <TouchableOpacity
                      style={[styles.adjustBtn, item.quantity <= 0 && styles.adjustBtnDisabled]}
                      onPress={() => adjustQuantity(item, -5)}
                      disabled={isUpdating || item.quantity <= 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.adjustBtnText}>-5</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjustBtn, item.quantity <= 0 && styles.adjustBtnDisabled]}
                      onPress={() => adjustQuantity(item, -1)}
                      disabled={isUpdating || item.quantity <= 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.adjustBtnText}>-1</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjustBtn, styles.adjustBtnPlus]}
                      onPress={() => adjustQuantity(item, 1)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.adjustBtnText, styles.adjustBtnPlusText]}>+1</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjustBtn, styles.adjustBtnPlus]}
                      onPress={() => adjustQuantity(item, 10)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.adjustBtnText, styles.adjustBtnPlusText]}>+10</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </Screen>

      {/* Add New Medicine Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <HTitle size={18}>Add New Medicine</HTitle>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Icon name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Medicine Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Adrenaline 1mg/ml Ampoule"
                placeholderTextColor={colors.inkFaint}
                value={newMedName}
                onChangeText={setNewMedName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['TABLET', 'INJECTION', 'EMERGENCY_DRUG', 'IV_FLUID', 'SYRUP'] as const).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setNewMedCategory(cat)}
                    style={[
                      styles.modalCatChip,
                      newMedCategory === cat && styles.modalCatChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalCatChipText,
                        newMedCategory === cat && styles.modalCatChipTextSelected,
                      ]}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Current Quantity *</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newMedQuantity}
                    onChangeText={setNewMedQuantity}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>Unit (Strips/Vials)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Strips"
                    value={newMedUnit}
                    onChangeText={setNewMedUnit}
                  />
                </View>
              </View>

              <View style={styles.modalFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Low Stock Alert At</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newMedThreshold}
                    onChangeText={setNewMedThreshold}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>Price (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={newMedPrice}
                    onChangeText={setNewMedPrice}
                  />
                </View>
              </View>

              <View style={{ marginTop: 20, marginBottom: 10 }}>
                <Button
                  title={addingSubmitting ? 'Saving...' : 'Confirm & Add to Stock'}
                  onPress={handleAddMedicine}
                  loading={addingSubmitting}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <HospitalNav active="/(hospital)/inventory" />
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1.5 },
  kpiNum: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 9.5, fontWeight: '700', color: colors.inkFaint, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.ink, paddingVertical: 0 },
  filterScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  filterChipSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  filterChipTextSelected: { color: '#fff' },
  emptyCard: { padding: 24, alignItems: 'center', marginVertical: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  itemCard: { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  medName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  medCategory: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qtyNumber: { fontSize: 18, fontWeight: '800', color: colors.ink },
  unitText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  thresholdText: { fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
  adjustRow: { flexDirection: 'row', gap: 6 },
  adjustBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  adjustBtnDisabled: { opacity: 0.4 },
  adjustBtnText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  adjustBtnPlus: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  adjustBtnPlusText: { color: colors.redDark },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.ink,
    marginBottom: 12,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  modalCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FAFC',
  },
  modalCatChipSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  modalCatChipText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  modalCatChipTextSelected: { color: '#fff' },
  modalFieldRow: { flexDirection: 'row' },
});
