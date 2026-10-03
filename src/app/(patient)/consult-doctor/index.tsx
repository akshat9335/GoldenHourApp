import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Chip, Button, Icon, Input, Banner, PatientNav } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { DOCTORS, SPECIALTIES } from '@/constants/doctorData';
import { api } from '@/services/api';

export default function ConsultDoctor() {
  const selectedSpecialty = useAppStore((s) => s.selectedSpecialty);
  const setSelectedSpecialty = useAppStore((s) => s.setSelectedSpecialty);
  const setSelectedDoctorId = useAppStore((s) => s.setSelectedDoctorId);
  const setSelectedDoctor = useAppStore((s) => s.setSelectedDoctor);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const [query, setQuery] = useState('');
  const [allDoctors, setAllDoctors] = useState(DOCTORS);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserToken = useAppStore((s) => s.setUserToken);
  const storeAppointments = useAppStore((s) => s.bookedAppointments || []);
  const setStoreAppointments = useAppStore((s) => s.setBookedAppointments);

  const [hasLoadedServerAppts, setHasLoadedServerAppts] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    const userLat = lastKnownLocation?.latitude || 25.4538;
    const userLng = lastKnownLocation?.longitude || 81.8540;

    const fetchDoctors = () => {
      api.doctors
        .search({
          specialty: selectedSpecialty !== 'All' ? selectedSpecialty : undefined,
          userLat,
          userLng,
        })
        .then((data: any) => {
          if (mounted && Array.isArray(data) && data.length > 0) {
            const mapped = data.map((d: any, idx: number) => {
              const rawDist = typeof d.distanceKm === 'number' ? d.distanceKm : 1.8;
              const distKm = Number(rawDist.toFixed(1));
              const serving = typeof d.servingToken === 'number' ? d.servingToken : 0;
              const queueLen = typeof d.queueLength === 'number' ? d.queueLength : 0;
              const currentTok = serving + queueLen;

              return {
                id: d.doctorId || d.id || `doc-be-${idx}`,
                name: d.name || `Dr. ${d.specialty || 'Practitioner'}`,
                specialization: d.specialty || d.specialization || 'General Physician',
                qualification: d.qualification || 'MBBS, MD',
                experience: d.experienceYears ? `${d.experienceYears} years experience` : (d.experience || '8+ yrs exp'),
                clinic: d.clinic?.clinicName || d.clinicName || 'Prayagraj Health Center',
                address: d.clinic?.address || d.clinicAddress || d.address || 'Civil Lines, Prayagraj',
                latitude: d.clinic?.lat ?? d.latitude ?? 25.4538,
                longitude: d.clinic?.lng ?? d.longitude ?? 81.8540,
                distanceKm: distKm,
                etaMin: Math.max(Math.round(distKm * 3), 3),
                fee: d.consultationFee ?? 500,
                workingHours: d.clinic?.workingHours || d.workingHours || '09:00 AM – 8:00 PM',
                status: (d.availability === 'AVAILABLE' ? 'open' : d.availability === 'BUSY' ? 'busy' : 'closed') as 'open' | 'busy' | 'closed',
                availableToday: d.availability !== 'OFFLINE',
                servingToken: serving,
                currentToken: currentTok,
                queueLength: queueLen,
                estimatedWaitMin: d.estimatedWaitMinutes ?? (queueLen * 8),
                verified: d.verificationStatus === 'VERIFIED' || d.verified === true,
              };
            });
            setAllDoctors(mapped);
          }
        })
        .catch(() => {
          // Offline demo fallback preserves DOCTORS
        });
    };

    // Fetch user's booked appointments with patientId & poll every 4s
    const pid = userProfile?.uid || (userProfile as any)?.id || 'patient-1';
    const fetchAppts = () => {
      api.appointments
        .getMyAppointments(pid)
        .then((res: any) => {
          const appts = Array.isArray(res) ? res : res?.data;
          if (mounted) {
            setHasLoadedServerAppts(true);
            if (Array.isArray(appts)) {
              setMyAppointments(appts);
              setStoreAppointments(appts);
            }
          }
        })
        .catch(() => {});
    };

    fetchDoctors();
    fetchAppts();
    const timer = setInterval(() => {
      fetchDoctors();
      fetchAppts();
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [selectedSpecialty, lastKnownLocation?.latitude, lastKnownLocation?.longitude, userProfile?.uid]);

  const combinedAppointments = hasLoadedServerAppts
    ? myAppointments
    : myAppointments.length > 0
    ? myAppointments
    : storeAppointments;
  const todayStr = new Date().toISOString().split('T')[0];

  const activeAppointments = combinedAppointments.filter(
    (a: any) =>
      (a.status || '').toUpperCase() !== 'COMPLETED' &&
      (a.status || '').toUpperCase() !== 'CANCELLED' &&
      (a.status || '').toUpperCase() !== 'NO_SHOW' &&
      (!a.date || a.date >= todayStr)
  );

  const completedAppointments = combinedAppointments.filter(
    (a: any) => (a.status || '').toUpperCase() === 'COMPLETED'
  );

  const expiredAppointments = combinedAppointments.filter(
    (a: any) =>
      (a.status || '').toUpperCase() !== 'COMPLETED' &&
      (a.status || '').toUpperCase() !== 'CANCELLED' &&
      (a.status || '').toUpperCase() !== 'NO_SHOW' &&
      a.date &&
      a.date < todayStr
  );

  const handleCancelAppointment = async (apptId: string) => {
    try {
      await api.appointments.cancel(apptId);
    } catch {}
    setMyAppointments((prev) =>
      prev.filter((a) => (a.appointmentId || a.id) !== apptId)
    );
    const updatedStore = (useAppStore.getState().bookedAppointments || []).filter(
      (a: any) => (a.appointmentId || a.id) !== apptId
    );
    useAppStore.getState().setBookedAppointments(updatedStore);
    Alert.alert('Appointment Cancelled', 'The appointment has been removed from active list.');
  };

  const doctors = allDoctors.filter((d) => {
    const matchesSpecialty = selectedSpecialty === 'All' || d.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase());
    const matchesQuery =
      !query.trim() ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.specialization.toLowerCase().includes(query.toLowerCase()) ||
      d.clinic.toLowerCase().includes(query.toLowerCase());
    return matchesSpecialty && matchesQuery;
  });

  function openDoctor(d: any) {
    setSelectedDoctorId(d.id);
    setSelectedDoctor(d);
    router.push('/(patient)/consult-doctor/doctor-profile');
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Consult Doctor" />
        <Text style={styles.subtitle}>Find verified doctors and nearby clinics</Text>

        <View style={styles.searchWrap}>
          <Icon name="search" size={16} color={colors.inkFaint} />
          <Input
            placeholder="Search doctors or specialties"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.chips}>
          {SPECIALTIES.map((s) => (
            <Chip key={s} label={s} selected={selectedSpecialty === s} onPress={() => setSelectedSpecialty(s)} />
          ))}
        </View>

        <Banner color="red" icon={<Icon name="ambulance" size={14} color={colors.red} />}>
          Need emergency help? Use SOS — Consult Doctor is for non-emergency consultations only.
        </Banner>
        <View style={{ height: 14 }} />

        {/* My Booked Appointments Section */}
        {/* Active Booked Appointments (Today or Future) */}
        {activeAppointments.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.eyebrow}>MY ACTIVE APPOINTMENTS</Text>
              <Pill color="blue">{activeAppointments.length} In Progress</Pill>
            </View>
            {activeAppointments.map((apt: any) => {
              const matchedDoc = allDoctors.find((d) => d.id === apt.doctorId);
              const docName = matchedDoc?.name || apt.doctorName || 'Dr. Medical Practitioner';
              const clinicName = matchedDoc?.clinic || apt.clinicName || 'Prayagraj Health Center';

              return (
                <Card key={apt.appointmentId || apt.id} style={[styles.card, { borderColor: colors.blue, borderWidth: 1.5, backgroundColor: '#f9fbff', marginBottom: 10 }]}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: colors.blue }]}>{docName}</Text>
                      <Text style={styles.sub}>{clinicName}</Text>
                      <Text style={styles.sub}>📅 {apt.date} · ⏰ {apt.timeSlot}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Pill color="blue">
                        {apt.status || 'CONFIRMED'}
                      </Pill>
                      <View style={{ backgroundColor: colors.blue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Token #{apt.tokenNumber}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Button
                      title="Track Queue"
                      style={{ flex: 1.2 }}
                      onPress={() => {
                        setSelectedDoctorId(apt.doctorId);
                        if (matchedDoc) setSelectedDoctor(matchedDoc);
                        setUserToken(apt.tokenNumber);
                        router.push('/(patient)/consult-doctor/live-queue');
                      }}
                    />
                    <Button
                      title="Directions"
                      variant="blue"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setSelectedDoctorId(apt.doctorId);
                        if (matchedDoc) setSelectedDoctor(matchedDoc);
                        router.push('/(patient)/consult-doctor/clinic-location');
                      }}
                    />
                    <Button
                      title="Cancel"
                      variant="ghost"
                      style={{ flex: 0.8 }}
                      onPress={() => handleCancelAppointment(apt.appointmentId || apt.id)}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Past Stale / Expired Appointments */}
        {expiredAppointments.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.eyebrow, { color: colors.inkFaint }]}>PAST UNATTENDED APPOINTMENTS ({expiredAppointments.length})</Text>
              <Pressable
                onPress={() => {
                  expiredAppointments.forEach((a) => handleCancelAppointment(a.appointmentId || a.id));
                }}
                style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#f1f3f5', borderRadius: 6 }}
              >
                <Text style={{ fontSize: 11, color: colors.inkFaint, fontWeight: '700' }}>Clear All</Text>
              </Pressable>
            </View>
            {expiredAppointments.map((apt: any) => {
              const matchedDoc = allDoctors.find((d) => d.id === apt.doctorId);
              const docName = matchedDoc?.name || apt.doctorName || 'Dr. Medical Practitioner';
              return (
                <Card key={apt.appointmentId || apt.id} style={[styles.card, { borderColor: colors.line, borderWidth: 1, backgroundColor: '#f8f9fa', marginBottom: 8 }]}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: colors.inkFaint }]}>{docName}</Text>
                      <Text style={styles.sub}>📅 {apt.date} · ⏰ {apt.timeSlot} · Token #{apt.tokenNumber}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleCancelAppointment(apt.appointmentId || apt.id)}
                      style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#e9ecef', borderRadius: 6 }}
                    >
                      <Text style={{ fontSize: 11, color: colors.ink, fontWeight: '600' }}>Dismiss</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Past Completed Consultations */}
        {completedAppointments.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.eyebrow}>COMPLETED CONSULTATIONS</Text>
              <Pill color="success">{completedAppointments.length} Finished</Pill>
            </View>
            {completedAppointments.map((apt: any) => {
              const matchedDoc = allDoctors.find((d) => d.id === apt.doctorId);
              const docName = matchedDoc?.name || apt.doctorName || 'Dr. Medical Practitioner';
              const clinicName = matchedDoc?.clinic || apt.clinicName || 'Prayagraj Health Center';

              return (
                <Card key={apt.appointmentId || apt.id} style={[styles.card, { borderColor: colors.line, borderWidth: 1, backgroundColor: '#fcfdfd', marginBottom: 10 }]}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: colors.ink }]}>{docName}</Text>
                      <Text style={styles.sub}>{clinicName}</Text>
                      <Text style={styles.sub}>📅 {apt.date} · ⏰ {apt.timeSlot}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Pill color="success">✓ COMPLETED</Pill>
                      <Text style={{ fontSize: 11, color: colors.inkFaint }}>Token #{apt.tokenNumber}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600', flex: 1 }}>
                      ✓ Health record & prescription recorded
                    </Text>
                    <Pressable
                      onPress={() => router.push('/(patient)/health-records' as any)}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: colors.blueBg, borderRadius: 6 }}
                    >
                      <Text style={{ fontSize: 11, color: colors.blue, fontWeight: '700' }}>View Rx →</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <Text style={styles.eyebrow}>DOCTORS NEAR YOU</Text>
        {doctors.length === 0 ? (
          <Text style={styles.empty}>No doctors found for this search.</Text>
        ) : (
          doctors.map((d) => (
            <Pressable key={d.id} onPress={() => openDoctor(d)}>
              <Card style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.name}>{d.name}</Text>
                      {d.verified && <Pill color="success">✓ VERIFIED</Pill>}
                    </View>
                    <Text style={styles.sub}>{d.specialization} · {d.qualification}</Text>
                    <Text style={styles.sub}>{d.experience}</Text>
                  </View>
                </View>

                <View style={styles.clinicRow}>
                  <Icon name="pin" size={14} color={colors.inkFaint} />
                  <Text style={styles.clinicText}>{d.clinic} · {d.distanceKm} km</Text>
                </View>

                <View style={styles.tagsRow}>
                  <Pill color={d.status === 'open' ? 'success' : d.status === 'busy' ? 'amber' : 'grey'}>
                    {d.status === 'open' ? (d.availableToday ? '🟢 Available Today' : '🟢 Open') : d.status === 'busy' ? '🟡 Busy' : '🔴 Closed'}
                  </Pill>
                  <Pill color="blue">₹{d.fee} consultation</Pill>
                </View>

                {d.status !== 'closed' && (
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueText}>Now Serving: {d.servingToken > 0 ? `Token #${d.servingToken}` : '0 (Queue Idle)'}</Text>
                    <Text style={styles.queueText}>Current Queue: {d.queueLength > 0 ? `${d.queueLength} waiting` : '0 waiting'}</Text>
                    <Text style={styles.waitText}>
                      {d.queueLength === 0
                        ? '🟢 Direct consultation available · 0 min wait'
                        : `${d.queueLength} patient(s) ahead · ~${d.estimatedWaitMin} min wait`}
                    </Text>
                  </View>
                )}

                <Button title="View Doctor" variant="secondary" style={{ marginTop: 10 }} onPress={() => openDoctor(d)} />
              </Card>
            </Pressable>
          ))
        )}
      </Screen>
      <PatientNav active="/(patient)/consult-doctor" />
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 12, color: colors.inkFaint, marginTop: -12, marginBottom: 16 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, borderWidth: 0, paddingLeft: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 10 },
  empty: { fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', marginTop: 20 },
  card: { padding: 14, marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '700', fontSize: 14, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  clinicText: { fontSize: 11.5, color: colors.ink, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  queueInfo: { marginTop: 10, backgroundColor: colors.grey, borderRadius: 12, padding: 10 },
  queueText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  waitText: { fontSize: 10.5, color: colors.inkFaint, marginTop: 4 },
});
