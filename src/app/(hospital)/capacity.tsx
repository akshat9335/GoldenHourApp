import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, LabelEyebrow, HospitalNav, Button, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function HospitalCapacity() {
  const userProfile = useAppStore((s) => s.userProfile);

  // Capacity states
  const [totalBeds, setTotalBeds] = useState(30);
  const [availableBeds, setAvailableBeds] = useState(22);
  const [icuBeds, setIcuBeds] = useState(6);
  const [availableIcuBeds, setAvailableIcuBeds] = useState(4);
  const [emergencyCapacity, setEmergencyCapacity] = useState(5);

  // Hospital profile & facilities
  const [hospitalName, setHospitalName] = useState(userProfile?.hospitalName || 'Hospital Center');
  const [hospitalType, setHospitalType] = useState('Multi-Specialty');
  const [facilities, setFacilities] = useState<string[]>([
    '24/7 Emergency',
    'ICU & Ventilators',
    'Trauma Bay',
    'Blood Bank',
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Medicine Inventory
  const rawHospId = userProfile?.hospitalId || userProfile?.assignedHospitalId || userProfile?.uid;
  const hospitalId = rawHospId
    ? (rawHospId.startsWith('hosp-') ? rawHospId : `hosp-${rawHospId}`)
    : 'hosp-srn-prayagraj';
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [addMedModalVisible, setAddMedModalVisible] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('Emergency / Resuscitation');
  const [newMedDosage, setNewMedDosage] = useState('1 Ampoule');
  const [newMedQty, setNewMedQty] = useState('50');
  const [newMedStatus, setNewMedStatus] = useState('AVAILABLE');
  const [submittingMed, setSubmittingMed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Fetch live capacity
    api.hospitals
      .getCapacity()
      .then((res: any) => {
        if (!mounted) return;
        const cap = res?.data || res;
        if (cap) {
          if (cap.totalBeds !== undefined) setTotalBeds(Number(cap.totalBeds));
          if (cap.availableBeds !== undefined) setAvailableBeds(Number(cap.availableBeds));
          if (cap.icuBeds !== undefined) setIcuBeds(Number(cap.icuBeds));
          if (cap.availableIcuBeds !== undefined) setAvailableIcuBeds(Number(cap.availableIcuBeds));
          if (cap.emergencyCapacity !== undefined) setEmergencyCapacity(Number(cap.emergencyCapacity));
        }
      })
      .catch(() => {
        // Fallback default state
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 2. Fetch hospital profile & facilities
    api.hospitals
      .getProfile()
      .then((res: any) => {
        if (!mounted) return;
        const p = res?.data || res;
        if (p) {
          if (p.name || p.hospitalName) setHospitalName(p.hospitalName || p.name);
          if (p.hospitalType) setHospitalType(p.hospitalType);
          if (Array.isArray(p.facilities) && p.facilities.length > 0) setFacilities(p.facilities);
        }
      })
      .catch(() => {});

    // 3. Fetch emergency medicine stock
    setLoadingMedicines(true);
    api.medicines
      .getHospitalInventory(hospitalId)
      .then((res: any) => {
        if (!mounted) return;
        const list = Array.isArray(res) ? res : (res?.data || []);
        setMedicines(list);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingMedicines(false);
      });

    return () => {
      mounted = false;
    };
  }, [hospitalId]);

  const handleAdjustWard = (delta: number) => {
    setAvailableBeds((prev) => Math.max(0, Math.min(totalBeds, prev + delta)));
    setSaveSuccess(false);
  };

  const handleAdjustTotalWard = (delta: number) => {
    setTotalBeds((prev) => {
      const nextTotal = Math.max(1, prev + delta);
      setAvailableBeds((currAvail) => Math.min(currAvail, nextTotal));
      return nextTotal;
    });
    setSaveSuccess(false);
  };

  const handleAdjustIcu = (delta: number) => {
    setAvailableIcuBeds((prev) => Math.max(0, Math.min(icuBeds, prev + delta)));
    setSaveSuccess(false);
  };

  const handleAdjustTotalIcu = (delta: number) => {
    setIcuBeds((prev) => {
      const nextIcu = Math.max(0, prev + delta);
      setAvailableIcuBeds((currAvail) => Math.min(currAvail, nextIcu));
      return nextIcu;
    });
    setSaveSuccess(false);
  };

  const handleAdjustEmergency = (delta: number) => {
    setEmergencyCapacity((prev) => Math.max(0, prev + delta));
    setSaveSuccess(false);
  };

  const handleToggleMedicine = async (medName: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === 'AVAILABLE'
        ? 'LOW_STOCK'
        : currentStatus === 'LOW_STOCK'
        ? 'OUT_OF_STOCK'
        : 'AVAILABLE';

    setMedicines((prev) =>
      prev.map((m) => (m.medicineName === medName ? { ...m, stockStatus: nextStatus } : m))
    );

    try {
      await api.medicines.updateStock({
        hospitalId,
        medicineName: medName,
        stockStatus: nextStatus,
      });
    } catch (_err) {
      // Revert if error
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedName.trim()) {
      Alert.alert('Medicine Name Required', 'Please enter the medicine name.');
      return;
    }
    setSubmittingMed(true);
    try {
      const res: any = await api.medicines.addMedicine({
        hospitalId,
        medicineName: newMedName.trim(),
        category: newMedCategory.trim(),
        dosageForm: newMedDosage.trim(),
        quantity: parseInt(newMedQty) || 50,
        stockStatus: newMedStatus,
      });
      const created = res?.data || res;
      setMedicines((prev) => [created, ...prev.filter((m) => m.medicineName !== newMedName.trim())]);
      setAddMedModalVisible(false);
      setNewMedName('');
      Alert.alert('Medicine Added', `${newMedName.trim()} registered to hospital inventory.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add medicine.');
    } finally {
      setSubmittingMed(false);
    }
  };

  const handleDeleteMedicine = (med: any) => {
    Alert.alert(
      'Remove Medicine?',
      `Are you sure you want to remove ${med.medicineName} from hospital stock?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const medId = med.id || `${hospitalId}_${med.medicineName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            setMedicines((prev) => prev.filter((m) => (m.id || m.medicineName) !== (med.id || med.medicineName)));
            try {
              await api.medicines.deleteMedicine(medId);
            } catch {}
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.hospitals.updateCapacity({
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds,
        emergencyCapacity,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update live capacity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <TopBar title="Live ER & Bed Capacity" back={false} />

        {saveSuccess && (
          <View style={styles.successBanner}>
            <Icon name="check" size={16} color={colors.success} />
            <Text style={styles.successBannerText}>Capacity synced with Golden Hour Network!</Text>
          </View>
        )}

        {/* Hospital Summary */}
        <Card style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.hospitalNameText}>{hospitalName}</Text>
              <Text style={styles.hospitalTypeText}>{hospitalType}</Text>
            </View>
            <Pill color="blue">Golden Hour Active</Pill>
          </View>

          <View style={styles.chipRow}>
            {facilities.map((fac) => (
              <View key={fac} style={styles.facilityChip}>
                <Text style={styles.facilityChipText}>✓ {fac}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Ward Bed Availability */}
        <LabelEyebrow>GENERAL WARD BEDS</LabelEyebrow>
        <Card style={styles.capacityCard}>
          <View style={styles.capRowHeader}>
            <View>
              <Text style={styles.capBigNumber}>
                {availableBeds} <Text style={styles.capTotalNumber}>/ {totalBeds}</Text>
              </Text>
              <Text style={styles.capSub}>
                {availableBeds === 0 ? 'No ward beds free' : `${availableBeds} beds available right now`}
              </Text>
            </View>
            <Pill color={availableBeds > 5 ? 'success' : availableBeds > 0 ? 'amber' : 'red'}>
              {availableBeds > 5 ? 'Available' : availableBeds > 0 ? 'Limited' : 'Full'}
            </Pill>
          </View>

          {/* Stepper buttons for Ward */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.stepBtn, styles.stepBtnMinus]}
              onPress={() => handleAdjustWard(-1)}
              disabled={availableBeds <= 0}
            >
              <Text style={styles.stepBtnMinusText}>− 1 Bed (Admit)</Text>
            </Pressable>
            <Pressable
              style={[styles.stepBtn, styles.stepBtnPlus]}
              onPress={() => handleAdjustWard(1)}
              disabled={availableBeds >= totalBeds}
            >
              <Text style={styles.stepBtnPlusText}>+ 1 Bed (Discharge)</Text>
            </Pressable>
          </View>

          {/* Total beds adjuster */}
          <View style={styles.totalAdjusterRow}>
            <Text style={styles.totalAdjusterLabel}>Total ward capacity:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustTotalWard(-1)}>
                <Text style={styles.miniBtnText}>−</Text>
              </Pressable>
              <Text style={styles.miniValue}>{totalBeds}</Text>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustTotalWard(1)}>
                <Text style={styles.miniBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* ICU Beds Availability */}
        <LabelEyebrow>ICU & VENTILATOR UNITS</LabelEyebrow>
        <Card style={styles.capacityCard}>
          <View style={styles.capRowHeader}>
            <View>
              <Text style={styles.capBigNumber}>
                {availableIcuBeds} <Text style={styles.capTotalNumber}>/ {icuBeds}</Text>
              </Text>
              <Text style={styles.capSub}>
                {availableIcuBeds === 0 ? 'All ICU beds occupied!' : `${availableIcuBeds} ICU units ready`}
              </Text>
            </View>
            <Pill color={availableIcuBeds > 2 ? 'success' : availableIcuBeds > 0 ? 'amber' : 'red'}>
              {availableIcuBeds > 2 ? 'Ready' : availableIcuBeds > 0 ? 'Critical' : 'Full'}
            </Pill>
          </View>

          {/* Stepper buttons for ICU */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.stepBtn, styles.stepBtnMinus]}
              onPress={() => handleAdjustIcu(-1)}
              disabled={availableIcuBeds <= 0}
            >
              <Text style={styles.stepBtnMinusText}>− 1 ICU (Occupy)</Text>
            </Pressable>
            <Pressable
              style={[styles.stepBtn, styles.stepBtnPlus]}
              onPress={() => handleAdjustIcu(1)}
              disabled={availableIcuBeds >= icuBeds}
            >
              <Text style={styles.stepBtnPlusText}>+ 1 ICU (Free)</Text>
            </Pressable>
          </View>

          {/* Total ICU adjuster */}
          <View style={styles.totalAdjusterRow}>
            <Text style={styles.totalAdjusterLabel}>Total ICU capacity:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustTotalIcu(-1)}>
                <Text style={styles.miniBtnText}>−</Text>
              </Pressable>
              <Text style={styles.miniValue}>{icuBeds}</Text>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustTotalIcu(1)}>
                <Text style={styles.miniBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Emergency Intake Bays */}
        <LabelEyebrow>TRAUMA BAY & EMERGENCY INTAKE</LabelEyebrow>
        <Card style={styles.capacityCard}>
          <View style={styles.capRowHeader}>
            <View>
              <Text style={styles.capBigNumber}>{emergencyCapacity} <Text style={styles.capTotalNumber}>Bays</Text></Text>
              <Text style={styles.capSub}>Active resuscitation and trauma triage bays</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustEmergency(-1)} disabled={emergencyCapacity <= 0}>
                <Text style={styles.miniBtnText}>−</Text>
              </Pressable>
              <Text style={styles.miniValue}>{emergencyCapacity}</Text>
              <Pressable style={styles.miniBtn} onPress={() => handleAdjustEmergency(1)}>
                <Text style={styles.miniBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Emergency Medicines Inventory */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
          <LabelEyebrow>EMERGENCY MEDICINE INVENTORY</LabelEyebrow>
          <TouchableOpacity
            onPress={() => setAddMedModalVisible(true)}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.blue }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#fff' }}>+ Add Medicine</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ padding: 4, marginBottom: 14 }}>
          {loadingMedicines ? (
            <View style={{ padding: 22, alignItems: 'center' }}>
              <ActivityIndicator color={colors.blue} />
              <Text style={{ fontSize: 12, color: colors.inkFaint, marginTop: 8 }}>Fetching medicine inventory...</Text>
            </View>
          ) : medicines.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>No registered medicines yet</Text>
              <Text style={{ fontSize: 11.5, color: colors.inkFaint, textAlign: 'center', marginVertical: 6 }}>
                Register critical emergency pharmaceuticals and resuscitation stocks for this hospital center.
              </Text>
              <TouchableOpacity
                onPress={() => setAddMedModalVisible(true)}
                style={{ backgroundColor: colors.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 6 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>+ Add Emergency Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            medicines.map((med, idx) => {
              const pillColor =
                med.stockStatus === 'AVAILABLE'
                  ? 'success'
                  : med.stockStatus === 'LOW_STOCK'
                  ? 'amber'
                  : 'red';
              return (
                <React.Fragment key={med.id || idx}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{med.medicineName}</Text>
                      <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 2 }}>
                        {med.category} · Qty: {med.quantity} {med.dosageForm ? `(${med.dosageForm})` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Pressable
                        onPress={() => handleToggleMedicine(med.medicineName, med.stockStatus)}
                        hitSlop={8}
                      >
                        <Pill color={pillColor}>{String(med.stockStatus || 'AVAILABLE').replace('_', ' ')} ▾</Pill>
                      </Pressable>
                      <TouchableOpacity
                        onPress={() => handleDeleteMedicine(med)}
                        hitSlop={8}
                        style={{ padding: 6 }}
                      >
                        <Text style={{ fontSize: 14, color: colors.inkFaint, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {idx < medicines.length - 1 && <View style={{ height: 1, backgroundColor: colors.line }} />}
                </React.Fragment>
              );
            })
          )}
        </Card>

        {/* Save button */}
        <View style={{ marginTop: 6, marginBottom: 20 }}>
          <Button
            title={saving ? 'Updating Capacity...' : 'Sync Capacity with Golden Hour Network'}
            onPress={handleSave}
            disabled={saving}
          />
        </View>

        {/* Add Medicine Modal */}
        <Modal
          visible={addMedModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddMedModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '85%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Register Medicine Stock</Text>
                <TouchableOpacity onPress={() => setAddMedModalVisible(false)}>
                  <Text style={{ fontSize: 18, color: colors.inkFaint }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 }}>MEDICINE NAME *</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 }}
                placeholder="e.g. Paracetamol 650mg, Atropine 0.6mg"
                value={newMedName}
                onChangeText={setNewMedName}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 }}>CATEGORY</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 }}
                placeholder="e.g. Emergency / Resuscitation, Cardiac, Antibiotic"
                value={newMedCategory}
                onChangeText={setNewMedCategory}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 }}>DOSAGE FORM</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, fontSize: 14 }}
                    placeholder="e.g. Tablet, Ampoule, IV Bag"
                    value={newMedDosage}
                    onChangeText={setNewMedDosage}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginBottom: 4 }}>QUANTITY</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, fontSize: 14 }}
                    placeholder="50"
                    keyboardType="numeric"
                    value={newMedQty}
                    onChangeText={setNewMedQty}
                  />
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 }}>STOCK STATUS</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: newMedStatus === st ? colors.blue : colors.line,
                      backgroundColor: newMedStatus === st ? '#EFF6FF' : '#F8FAFC',
                    }}
                    onPress={() => setNewMedStatus(st)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: newMedStatus === st ? colors.blue : colors.inkSoft }}>
                      {st.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={submittingMed ? 'Adding...' : 'Save to Hospital Inventory'}
                onPress={handleAddMedicine}
                disabled={submittingMed}
              />
            </View>
          </View>
        </Modal>
      </Screen>
      <HospitalNav active="/(hospital)/capacity" />
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    flex: 1,
  },
  summaryCard: {
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  hospitalNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  hospitalTypeText: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  facilityChip: {
    backgroundColor: colors.grey,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  facilityChipText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: '600',
  },
  capacityCard: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  capRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  capBigNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  capTotalNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  capSub: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  stepBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepBtnMinus: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  stepBtnMinusText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  stepBtnPlus: {
    backgroundColor: colors.successBg,
    borderColor: '#A7F3D0',
  },
  stepBtnPlusText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  totalAdjusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalAdjusterLabel: {
    fontSize: 11.5,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.grey,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
});
