import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
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

    return () => {
      mounted = false;
    };
  }, []);

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

        {/* Save button */}
        <View style={{ marginTop: 10, marginBottom: 20 }}>
          <Button
            title={saving ? 'Updating Capacity...' : 'Sync Capacity with Golden Hour Network'}
            onPress={handleSave}
            disabled={saving}
          />
        </View>
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
