import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';
import { Screen, Card, TopBar, Pill, Button, Divider, Icon, Input, InputGroup, LabelEyebrow, HTitle } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

interface ReferralItem {
  id: string;
  patientUid: string;
  patientName: string;
  patientPhone: string;
  crisisId: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringFacilityName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  targetDepartment: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  reasonForReferral: string;
  clinicalNotes: string;
  status: 'CREATED' | 'HOSPITAL_ACCEPTED' | 'REJECTED' | 'PATIENT_ARRIVED' | 'IN_TREATMENT' | 'COMPLETED';
  rejectionReason?: string;
  hospitalNotes?: string;
  createdAt: string;
}

export default function HospitalReferralsQueueScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const hospitalId = userProfile?.hospitalId || userProfile?.uid || 'hosp-apollo-delhi';

  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED'>('PENDING');

  // Accept & Reserve Bed Modal state
  const [acceptModalItem, setAcceptModalItem] = useState<ReferralItem | null>(null);
  const [bedNumber, setBedNumber] = useState('ICU-04');
  const [acceptNotes, setAcceptNotes] = useState('Bed reserved in Trauma ICU. Cath lab on standby.');

  // Reject modal state
  const [rejectModalItem, setRejectModalItem] = useState<ReferralItem | null>(null);
  const [rejectReason, setRejectReason] = useState('No ICU bed capacity available. Divert to Max Saket.');

  const [updating, setUpdating] = useState(false);

  const fetchIncoming = async () => {
    setLoading(true);
    try {
      const res = await api.referrals.getIncoming();
      if (res && Array.isArray(res)) {
        setReferrals(res);
      } else {
        // Mock default referrals if empty
        setReferrals([
          {
            id: 'ref-demo-101',
            patientUid: 'pat-101',
            patientName: 'Rahul Verma',
            patientPhone: '+91 98765 43210',
            crisisId: 'AS-4232',
            referringDoctorId: 'doc-sharma-trauma',
            referringDoctorName: 'Dr. Rajesh Sharma',
            referringFacilityName: 'Apex Trauma Clinic',
            targetHospitalId: hospitalId,
            targetHospitalName: 'Apollo Hospital',
            targetDepartment: 'Trauma & Critical Care',
            priority: 'EMERGENCY',
            reasonForReferral: 'Critical blunt trauma with suspected internal hemorrhage',
            clinicalNotes: 'Vitals: BP 90/60, HR 124 bpm, SpO2 92%. Infusing Ringer Lactate. Suspected hemoperitoneum.',
            status: 'CREATED',
            createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          },
          {
            id: 'ref-demo-102',
            patientUid: 'pat-102',
            patientName: 'Meera Sen',
            patientPhone: '+91 98111 22334',
            crisisId: 'GH-8819',
            referringDoctorId: 'doc-verma-ortho',
            referringDoctorName: 'Dr. Anjali Verma',
            referringFacilityName: 'Verma Ortho Clinic',
            targetHospitalId: hospitalId,
            targetHospitalName: 'Apollo Hospital',
            targetDepartment: 'Orthopedics & Spine',
            priority: 'URGENT',
            reasonForReferral: 'Compound fracture right tibia with neurovascular compromise',
            clinicalNotes: 'Pulsatile bleeding controlled with pressure bandage. Splint applied. Needs surgical fixation.',
            status: 'HOSPITAL_ACCEPTED',
            hospitalNotes: 'Bed reserved in Ward 3, Bed 12. OT prepared.',
            createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
  }, []);

  const handleAcceptConfirm = async () => {
    if (!acceptModalItem) return;
    setUpdating(true);
    try {
      const fullNotes = `Bed ${bedNumber}: ${acceptNotes}`.trim();
      await api.referrals.updateStatus(acceptModalItem.id, 'HOSPITAL_ACCEPTED', fullNotes);

      setReferrals((prev) =>
        prev.map((r) =>
          r.id === acceptModalItem.id
            ? { ...r, status: 'HOSPITAL_ACCEPTED', hospitalNotes: fullNotes }
            : r
        )
      );

      Alert.alert('Accepted & Reserved', `Patient ${acceptModalItem.patientName} accepted. Bed ${bedNumber} reserved.`);
      setAcceptModalItem(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update referral status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    setUpdating(true);
    try {
      await api.referrals.updateStatus(rejectModalItem.id, 'REJECTED', rejectReason);

      setReferrals((prev) =>
        prev.map((r) =>
          r.id === rejectModalItem.id
            ? { ...r, status: 'REJECTED', rejectionReason: rejectReason }
            : r
        )
      );

      Alert.alert('Referral Rejected', `Referral rejected with note: ${rejectReason}`);
      setRejectModalItem(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reject referral.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (filter === 'PENDING') return r.status === 'CREATED';
    if (filter === 'ACCEPTED') return r.status === 'HOSPITAL_ACCEPTED';
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return <Pill color="red">🔴 EMERGENCY</Pill>;
      case 'URGENT':
        return <Pill color="orange">🟡 URGENT</Pill>;
      default:
        return <Pill color="success">🟢 ROUTINE</Pill>;
    }
  };

  return (
    <Screen padBottom={110}>
      <TopBar title="Hospital Referral Queue" />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterTab, filter === 'PENDING' && styles.filterTabActive]}
          onPress={() => setFilter('PENDING')}
        >
          <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>
            Pending ({referrals.filter((r) => r.status === 'CREATED').length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'ACCEPTED' && styles.filterTabActive]}
          onPress={() => setFilter('ACCEPTED')}
        >
          <Text style={[styles.filterText, filter === 'ACCEPTED' && styles.filterTextActive]}>
            Accepted ({referrals.filter((r) => r.status === 'HOSPITAL_ACCEPTED').length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            All ({referrals.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>
            Syncing inbound patient referrals...
          </Text>
        </View>
      ) : filteredReferrals.length === 0 ? (
        <Card style={{ padding: 24, alignItems: 'center', marginTop: 12 }}>
          <Icon name="bed" size={32} color={colors.inkFaint} />
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 10 }}>
            Queue Is Clear
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 6 }}>
            No incoming referrals matching this filter currently waiting.
          </Text>
        </Card>
      ) : (
        filteredReferrals.map((item) => (
          <Card key={item.id} style={styles.referralCard}>
            <View style={styles.cardTop}>
              {getPriorityBadge(item.priority)}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <View style={styles.crisisIdBadge}>
                  <Text style={styles.crisisIdText}>ID: {item.crisisId}</Text>
                </View>
              </View>
              <Text style={styles.patientPhone}>📞 {item.patientPhone || 'No contact provided'}</Text>
            </View>

            <View style={styles.referringBox}>
              <Text style={styles.boxLabel}>REFERRING CLINICIAN</Text>
              <Text style={styles.doctorText}>
                👨‍⚕️ {item.referringDoctorName} ({item.referringFacilityName})
              </Text>
              <Text style={styles.deptText}>
                Requested Dept: <Text style={{ fontWeight: '800' }}>{item.targetDepartment}</Text>
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.boxLabel}>REASON FOR REFERRAL</Text>
              <Text style={styles.reasonText}>{item.reasonForReferral}</Text>
            </View>

            {item.clinicalNotes ? (
              <View style={styles.clinicalNotesBox}>
                <Text style={styles.boxLabel}>CLINICAL HANDOFF NOTES</Text>
                <Text style={styles.notesText}>{item.clinicalNotes}</Text>
              </View>
            ) : null}

            {item.hospitalNotes ? (
              <View style={styles.hospitalNotesBox}>
                <Text style={styles.boxLabel}>HOSPITAL RESERVATION</Text>
                <Text style={styles.hospitalNotesText}>✓ {item.hospitalNotes}</Text>
              </View>
            ) : null}

            {item.status === 'CREATED' && (
              <>
                <Divider />
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => setRejectModalItem(item)}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>

                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => {
                      setAcceptModalItem(item);
                      setBedNumber('ICU-0' + Math.floor(1 + Math.random() * 8));
                    }}
                  >
                    <Text style={styles.acceptBtnText}>✓ Accept & Reserve Bed</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Card>
        ))
      )}

      {/* Accept & Reserve Bed Modal */}
      <Modal
        visible={!!acceptModalItem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAcceptModalItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <LabelEyebrow>EMERGENCY ADMISSION</LabelEyebrow>
                <HTitle size={16}>Accept & Reserve Bed</HTitle>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setAcceptModalItem(null)}>
                <Icon name="close" size={16} />
              </Pressable>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={{ fontSize: 13, color: colors.inkSoft, marginBottom: 14 }}>
                Accepting referral for{' '}
                <Text style={{ fontWeight: '800', color: colors.ink }}>
                  {acceptModalItem?.patientName} (Crisis ID: {acceptModalItem?.crisisId})
                </Text>
              </Text>

              <InputGroup label="Assigned Bed / Unit *">
                <Input
                  placeholder="e.g. ICU-04, ER-Bay 2"
                  value={bedNumber}
                  onChangeText={setBedNumber}
                />
              </InputGroup>

              <InputGroup label="Readiness / Preparation Notes">
                <Input
                  placeholder="Team notified, equipment prepared..."
                  value={acceptNotes}
                  onChangeText={setAcceptNotes}
                  multiline
                />
              </InputGroup>

              <Button
                title={updating ? 'Confirming Reservation...' : 'Confirm Acceptance & Reserve'}
                onPress={handleAcceptConfirm}
                loading={updating}
                disabled={updating}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={!!rejectModalItem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRejectModalItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <LabelEyebrow>REFERRAL REJECTION</LabelEyebrow>
                <HTitle size={16}>Specify Reason</HTitle>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setRejectModalItem(null)}>
                <Icon name="close" size={16} />
              </Pressable>
            </View>

            <View style={{ padding: 18 }}>
              <InputGroup label="Reason for Rejection *">
                <Input
                  placeholder="e.g. No ventilator beds, specialist unavailable..."
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                />
              </InputGroup>

              <Button
                title={updating ? 'Rejecting...' : 'Confirm Rejection'}
                variant="primary"
                onPress={handleRejectConfirm}
                loading={updating}
                disabled={updating}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  filterTabActive: {
    backgroundColor: '#FFF',
    ...shadow.card,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  filterTextActive: {
    color: colors.ink,
    fontWeight: '800',
  },
  referralCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  crisisIdBadge: {
    backgroundColor: colors.redGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  crisisIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  patientPhone: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  referringBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: 10,
    marginTop: 10,
  },
  boxLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  doctorText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
  },
  deptText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  clinicalNotesBox: {
    backgroundColor: '#FFFDE7',
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    borderRadius: radii.sm,
    padding: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
  },
  hospitalNotesBox: {
    backgroundColor: colors.successBg,
    borderRadius: radii.sm,
    padding: 8,
    marginTop: 8,
  },
  hospitalNotesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  acceptBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
