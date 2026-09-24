import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator,
  RefreshControl, TouchableOpacity, SafeAreaView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Chip, HTitle, Banner, Icon, Divider } from '@/components/ui';
import { api } from '@/services/api';
import { authService } from '@/services/auth';

type Tab = 'PENDING_DOCTORS' | 'ACTIVE_DOCTORS' | 'HOSPITALS' | 'AMBULANCES' | 'WORKERS' | 'ALL';
type AdminState = 'LOGIN' | 'NOT_AUTHORIZED' | 'DASHBOARD';

interface ApplicationItem {
  id: string; userId: string; role: string; name: string;
  email?: string | null; phone?: string | null;
  verificationStatus: string; submittedAt: string;
  details: {
    specialty?: string | null; qualification?: string | null; licenseNumber?: string | null;
    clinicName?: string | null; clinicAddress?: string | null; consultationFee?: number | null;
    [key: string]: any;
  };
}

// ─── Admin Login Gate ─────────────────────────────────────────────────────────

function AdminLoginScreen({ onLogin, loading }: { onLogin: () => void; loading: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={gateStyles.container}>
      <View style={gateStyles.content}>
        <TouchableOpacity
          style={[gateStyles.backButton, { top: Math.max(insets.top, 16) + 6 }]}
          onPress={() => router.replace('/role-selection')}
          activeOpacity={0.7}
        >
          <Text style={gateStyles.backArrow}>&#8249;</Text>
          <Text style={gateStyles.backText}>Back</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/images/golden-hour-logo.png')} style={gateStyles.logo} resizeMode="contain" />
        <View style={gateStyles.shieldWrap}>
          <Text style={gateStyles.shieldIcon}>🛡️</Text>
        </View>
        <Text style={gateStyles.title}>Admin Console</Text>
        <Text style={gateStyles.subtitle}>Restricted access — authorised personnel only</Text>
        <View style={gateStyles.card}>
          <Text style={gateStyles.cardTitle}>Verify Your Identity</Text>
          <Text style={gateStyles.cardSub}>
            Sign in with your authorised Google account to access the professional credential verification desk.
          </Text>
          <TouchableOpacity style={gateStyles.googleButton} activeOpacity={0.85} onPress={onLogin} disabled={loading}>
            <View style={gateStyles.googleIcon}><Text style={gateStyles.googleG}>G</Text></View>
            <Text style={gateStyles.googleText}>{loading ? 'Verifying access...' : 'Continue with Google'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={gateStyles.notice}>Only accounts authorised by the system administrator can access this panel.</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Not Authorized Screen ────────────────────────────────────────────────────

function NotAuthorizedScreen({ email, onRetry }: { email?: string; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={gateStyles.container}>
      <View style={gateStyles.content}>
        <TouchableOpacity
          style={[gateStyles.backButton, { top: Math.max(insets.top, 16) + 6 }]}
          onPress={() => router.replace('/role-selection')}
          activeOpacity={0.7}
        >
          <Text style={gateStyles.backArrow}>&#8249;</Text>
          <Text style={gateStyles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={[gateStyles.shieldWrap, { backgroundColor: '#FEF2F2' }]}>
          <Text style={gateStyles.shieldIcon}>🚫</Text>
        </View>
        <Text style={gateStyles.title}>Access Denied</Text>
        <Text style={gateStyles.subtitle}>
          {email ? `${email}\nis not an authorised administrator.` : 'Your account does not have administrator privileges.'}
        </Text>
        <View style={gateStyles.card}>
          <Text style={gateStyles.cardSub}>
            If you believe this is a mistake, contact the system administrator to have your account added to the authorised list.
          </Text>
          <TouchableOpacity style={[gateStyles.googleButton, { borderColor: '#DC2626', marginTop: 4 }]} onPress={onRetry} activeOpacity={0.8}>
            <Text style={[gateStyles.googleText, { color: '#DC2626' }]}>Try a Different Account</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.replace('/role-selection')} activeOpacity={0.7}>
          <Text style={gateStyles.returnLink}>← Return to Role Selection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [adminState, setAdminState] = useState<AdminState>('LOGIN');
  const [loginLoading, setLoginLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<Tab>('PENDING_DOCTORS');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAdminLogin = async () => {
    try {
      setLoginLoading(true);
      const session = await authService.promptGoogleSignIn();
      try {
        const res: any = await api.admin.getApplications();
        const items = Array.isArray(res) ? res : (res?.data || []);
        setApplications(items);
        setAdminEmail(session?.email || (session as any)?.profile?.email || null);
        // Reached without 403 — user is confirmed admin
        setAdminState('DASHBOARD');
      } catch (err: any) {
        const is403 =
          err?.status === 403 ||
          String(err?.message || '').includes('ADMIN') ||
          String(err?.message || '').includes('FORBIDDEN');
        if (is403) {
          setUnauthorizedEmail((session as any)?.profile?.email || (session as any)?.email || undefined);
          setAdminState('NOT_AUTHORIZED');
          await authService.logout();
        } else {
          Alert.alert('Connection Error', err?.message || 'Could not reach the server. Check your connection and try again.');
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Failed', msg || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleExitAdmin = () => {
    setAdminState('LOGIN');
    setAdminEmail(null);
    router.replace('/role-selection');
  };

  const handleRetry = () => { setUnauthorizedEmail(undefined); setAdminState('LOGIN'); };

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.admin.getApplications();
      const items = Array.isArray(res) ? res : (res?.data || []);
      setApplications(items);
    } catch (err: any) {
      console.warn('[AdminDashboard] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (adminState === 'DASHBOARD') fetchApplications();
  }, [adminState, fetchApplications]);

  const handleDecision = async (
    item: ApplicationItem,
    decision: 'APPROVED' | 'REJECTED',
    isRevoke = false
  ) => {
    const roleUpper = (item.role || '').toUpperCase();
    const isHospital = roleUpper === 'HOSPITAL';
    const isDriver = roleUpper === 'AMBULANCE_DRIVER';
    const isWorker = roleUpper === 'FRONTLINE_WORKER' || roleUpper === 'ASHA';
    const roleLabel = isHospital ? 'Hospital' : isDriver ? 'Ambulance Driver' : isWorker ? 'ASHA / ANM Worker' : 'Doctor';
    const namePrefix = isHospital || isDriver || isWorker ? '' : 'Dr. ';

    let title = decision === 'APPROVED' ? `Approve ${roleLabel}` : `Reject ${roleLabel}`;
    let message = `Are you sure you want to ${decision === 'APPROVED' ? 'APPROVE' : 'REJECT'} ${namePrefix}${item.name}'s registration?`;
    let confirmBtnText = decision === 'APPROVED' ? 'Approve' : 'Reject';

    if (isRevoke) {
      title = `Revoke ${roleLabel} Access`;
      message = `Are you sure you want to REVOKE ${namePrefix}${item.name}'s active approval? They will immediately lose access to the ${roleLabel.toLowerCase()} console.`;
      confirmBtnText = 'Revoke Access';
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmBtnText,
        style: decision === 'REJECTED' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setActionInProgress(item.id);
            if (isHospital) {
              await api.admin.verifyApplication('HOSPITAL', item.id, decision);
            } else if (isDriver) {
              await api.admin.verifyApplication('AMBULANCE_DRIVER', item.id, decision);
            } else if (isWorker) {
              await api.admin.verifyApplication('FRONTLINE_WORKER', item.id, decision);
            } else {
              await api.admin.verifyDoctor(item.id, decision);
            }
            Alert.alert(
              'Status Updated',
              isRevoke
                ? `${namePrefix}${item.name}'s access has been revoked.`
                : `${namePrefix}${item.name} has been ${decision.toLowerCase()}.`
            );
            await fetchApplications();
          } catch (err: any) {
            Alert.alert('Action Failed', err?.message || 'Could not complete the update.');
          } finally {
            setActionInProgress(null);
          }
        },
      },
    ]);
  };

  if (adminState === 'LOGIN') return <AdminLoginScreen onLogin={handleAdminLogin} loading={loginLoading} />;
  if (adminState === 'NOT_AUTHORIZED') return <NotAuthorizedScreen email={unauthorizedEmail} onRetry={handleRetry} />;

  const pendingDoctors = applications.filter(
    a => (a.role || '').toUpperCase() === 'DOCTOR' && (a.verificationStatus || '').toUpperCase() === 'PENDING'
  );
  const approvedDoctors = applications.filter(
    a => (a.role || '').toUpperCase() === 'DOCTOR' && (a.verificationStatus || '').toUpperCase() === 'APPROVED'
  );
  const allDoctors = applications.filter(
    a => (a.role || '').toUpperCase() === 'DOCTOR'
  );

  const pendingHospitals = applications.filter(
    a => (a.role || '').toUpperCase() === 'HOSPITAL' && (a.verificationStatus || '').toUpperCase() === 'PENDING'
  );
  const approvedHospitals = applications.filter(
    a => (a.role || '').toUpperCase() === 'HOSPITAL' && (a.verificationStatus || '').toUpperCase() === 'APPROVED'
  );
  const allHospitals = applications.filter(
    a => (a.role || '').toUpperCase() === 'HOSPITAL'
  );

  const pendingDrivers = applications.filter(
    a => (a.role || '').toUpperCase() === 'AMBULANCE_DRIVER' && (a.verificationStatus || '').toUpperCase() === 'PENDING'
  );
  const approvedDrivers = applications.filter(
    a => (a.role || '').toUpperCase() === 'AMBULANCE_DRIVER' && (a.verificationStatus || '').toUpperCase() === 'APPROVED'
  );
  const allDrivers = applications.filter(
    a => (a.role || '').toUpperCase() === 'AMBULANCE_DRIVER'
  );

  const pendingWorkers = applications.filter(
    a => ((a.role || '').toUpperCase() === 'FRONTLINE_WORKER' || (a.role || '').toUpperCase() === 'ASHA') && (a.verificationStatus || '').toUpperCase() === 'PENDING'
  );
  const approvedWorkers = applications.filter(
    a => ((a.role || '').toUpperCase() === 'FRONTLINE_WORKER' || (a.role || '').toUpperCase() === 'ASHA') && (a.verificationStatus || '').toUpperCase() === 'APPROVED'
  );
  const allWorkers = applications.filter(
    a => (a.role || '').toUpperCase() === 'FRONTLINE_WORKER' || (a.role || '').toUpperCase() === 'ASHA'
  );

  const renderWorkerCard = (app: ApplicationItem) => {
    const status = (app.verificationStatus || '').toUpperCase();
    const isPending = status === 'PENDING';
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const isBusy = actionInProgress === app.id;

    return (
      <Card key={app.id} style={styles.appCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{app.name}</Text>
            <Text style={styles.docSpec}>
              {app.details?.workerType === 'ANM' ? '💉 Auxiliary Nurse Midwife (ANM)' : '🌾 ASHA Community Worker'}
            </Text>
          </View>
          <Pill
            color={
              isApproved
                ? 'success'
                : isRejected
                ? 'red'
                : 'amber'
            }
          >
            {isApproved ? 'VERIFIED ACTIVE' : app.verificationStatus}
          </Pill>
        </View>
        <Divider />
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Assigned PHC</Text>
            <Text style={styles.detailValue}>{app.details?.assignedPhc || 'Prayagraj Rural PHC'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Village / Ward</Text>
            <Text style={styles.detailValue}>{app.details?.village || 'General Area'}</Text>
          </View>
        </View>
        {app.details?.regNumber ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Govt Worker Reg No.</Text>
            <Text style={styles.detailValue}>{app.details.regNumber}</Text>
          </View>
        ) : null}
        {app.email ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Contact Email</Text>
            <Text style={styles.detailValue}>{app.email}</Text>
          </View>
        ) : null}
        {app.phone ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{app.phone}</Text>
          </View>
        ) : null}

        {/* Pending Actions */}
        {isPending && (
          <View style={styles.actionRow}>
            <Button
              title={isBusy ? 'Processing...' : 'Approve Worker'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ flex: 1, backgroundColor: colors.success, marginRight: 8 }}
            />
            <Button
              title="Reject"
              variant="secondary"
              onPress={() => handleDecision(app, 'REJECTED')}
              disabled={isBusy}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Active Worker: Option to Revoke */}
        {isApproved && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleDecision(app, 'REJECTED', true)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Text style={styles.revokeIcon}>🚫</Text>
                <Text style={styles.revokeButtonText}>Revoke / Remove Worker</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rejected Worker: Option to Re-Approve */}
        {isRejected && (
          <View style={{ marginTop: 12 }}>
            <Button
              title={isBusy ? 'Processing...' : 'Re-Approve Worker'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ backgroundColor: colors.success }}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderDoctorCard = (app: ApplicationItem) => {
    const status = (app.verificationStatus || '').toUpperCase();
    const isPending = status === 'PENDING';
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const isBusy = actionInProgress === app.id;

    return (
      <Card key={app.id} style={styles.appCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{app.name}</Text>
            <Text style={styles.docSpec}>
              {app.details?.specialty || 'General Practitioner'} • {app.details?.qualification || 'MBBS'}
            </Text>
          </View>
          <Pill
            color={
              isApproved
                ? 'success'
                : isRejected
                ? 'red'
                : 'amber'
            }
          >
            {isApproved ? 'VERIFIED ACTIVE' : app.verificationStatus}
          </Pill>
        </View>
        <Divider />
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Medical Reg No</Text>
            <Text style={styles.detailValue}>{app.details?.licenseNumber || 'Not provided'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Consultation Fee</Text>
            <Text style={styles.detailValue}>Rs.{app.details?.consultationFee || 500}</Text>
          </View>
        </View>
        {app.details?.clinicName ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Clinic / Practice</Text>
            <Text style={styles.detailValue}>
              {app.details.clinicName}
              {app.details.clinicAddress ? ` • ${app.details.clinicAddress}` : ''}
            </Text>
          </View>
        ) : null}
        {app.email ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Contact Email</Text>
            <Text style={styles.detailValue}>{app.email}</Text>
          </View>
        ) : null}
        {app.phone ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{app.phone}</Text>
          </View>
        ) : null}

        {/* Pending Actions: Approve / Reject */}
        {isPending && (
          <View style={styles.actionRow}>
            <Button
              title={isBusy ? 'Processing...' : 'Approve'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ flex: 1, backgroundColor: colors.success, marginRight: 8 }}
            />
            <Button
              title="Reject"
              variant="secondary"
              onPress={() => handleDecision(app, 'REJECTED')}
              disabled={isBusy}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Active Doctor Action: Revoke / Remove */}
        {isApproved && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleDecision(app, 'REJECTED', true)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Text style={styles.revokeIcon}>🚫</Text>
                <Text style={styles.revokeButtonText}>Revoke / Remove Doctor</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rejected Doctor in All Tab: Option to Re-Approve */}
        {isRejected && activeTab === 'ALL' && (
          <View style={{ marginTop: 12 }}>
            <Button
              title={isBusy ? 'Processing...' : 'Re-Approve Doctor'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ backgroundColor: colors.success }}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderHospitalCard = (app: ApplicationItem) => {
    const status = (app.verificationStatus || '').toUpperCase();
    const isPending = status === 'PENDING';
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const isBusy = actionInProgress === app.id;

    return (
      <Card key={app.id} style={styles.appCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{app.name}</Text>
            <Text style={styles.docSpec}>
              {app.details?.registrationNumber ? `Reg: ${app.details.registrationNumber}` : 'Hospital Facility'}
            </Text>
          </View>
          <Pill
            color={
              isApproved
                ? 'success'
                : isRejected
                ? 'red'
                : 'amber'
            }
          >
            {isApproved ? 'VERIFIED FACILITY' : app.verificationStatus}
          </Pill>
        </View>
        <Divider />
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Emergency Contact</Text>
            <Text style={styles.detailValue}>{app.phone || 'Not provided'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contact Email</Text>
            <Text style={styles.detailValue}>{app.email || 'Not provided'}</Text>
          </View>
        </View>
        {app.details?.address ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Facility Address</Text>
            <Text style={styles.detailValue}>{app.details.address}</Text>
          </View>
        ) : null}
        {Array.isArray(app.details?.facilities) && app.details.facilities.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Facilities / Departments</Text>
            <Text style={styles.detailValue}>{app.details.facilities.join(' • ')}</Text>
          </View>
        ) : null}

        {/* Pending Actions: Approve / Reject */}
        {isPending && (
          <View style={styles.actionRow}>
            <Button
              title={isBusy ? 'Processing...' : 'Approve Facility'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ flex: 1, backgroundColor: colors.success, marginRight: 8 }}
            />
            <Button
              title="Reject"
              variant="secondary"
              onPress={() => handleDecision(app, 'REJECTED')}
              disabled={isBusy}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Active Hospital Action: Revoke / Remove */}
        {isApproved && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleDecision(app, 'REJECTED', true)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Text style={styles.revokeIcon}>🚫</Text>
                <Text style={styles.revokeButtonText}>Revoke Hospital Access</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rejected Hospital: Option to Re-Approve */}
        {isRejected && (
          <View style={{ marginTop: 12 }}>
            <Button
              title={isBusy ? 'Processing...' : 'Re-Approve Hospital'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ backgroundColor: colors.success }}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderDriverCard = (app: ApplicationItem) => {
    const status = (app.verificationStatus || '').toUpperCase();
    const isPending = status === 'PENDING';
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const isBusy = actionInProgress === app.id;

    return (
      <Card key={app.id} style={styles.appCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName}>{app.name}</Text>
            <Text style={styles.docSpec}>
              {app.details?.ambulanceType || 'Basic Life Support (BLS)'} • {app.details?.ambulanceId || app.details?.vehiclePlateNumber || 'Vehicle ID'}
            </Text>
          </View>
          <Pill
            color={
              isApproved
                ? 'success'
                : isRejected
                ? 'red'
                : 'amber'
            }
          >
            {isApproved ? 'VERIFIED ACTIVE' : app.verificationStatus}
          </Pill>
        </View>
        <Divider />
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Driving License ID</Text>
            <Text style={styles.detailValue}>{app.details?.licenseNumber || 'DL-PENDING'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Vehicle Plate Number</Text>
            <Text style={styles.detailValue}>{app.details?.ambulanceId || app.details?.vehiclePlateNumber || 'Not provided'}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.detailLabel}>Hospital Affiliation</Text>
          <Text style={styles.detailValue}>{app.details?.hospitalName || 'Independent Fleet'}</Text>
        </View>
        {app.email ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Contact Email</Text>
            <Text style={styles.detailValue}>{app.email}</Text>
          </View>
        ) : null}
        {app.phone ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{app.phone}</Text>
          </View>
        ) : null}

        {/* Pending Actions */}
        {isPending && (
          <View style={styles.actionRow}>
            <Button
              title={isBusy ? 'Processing...' : 'Approve Driver'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ flex: 1, backgroundColor: colors.success, marginRight: 8 }}
            />
            <Button
              title="Reject"
              variant="secondary"
              onPress={() => handleDecision(app, 'REJECTED')}
              disabled={isBusy}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Active Driver: Option to Revoke */}
        {isApproved && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleDecision(app, 'REJECTED', true)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Text style={styles.revokeIcon}>🚫</Text>
                <Text style={styles.revokeButtonText}>Revoke / Remove Driver</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Rejected Driver: Option to Re-Approve */}
        {isRejected && (
          <View style={{ marginTop: 12 }}>
            <Button
              title={isBusy ? 'Processing...' : 'Re-Approve Driver'}
              onPress={() => handleDecision(app, 'APPROVED')}
              disabled={isBusy}
              style={{ backgroundColor: colors.success }}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <TopBar title="Admin Console" onPressBack={handleExitAdmin} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchApplications(); }} />}
      >
        <View style={styles.adminBar}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.adminBadge}>🛡️ Authorized Administrator</Text>
            {adminEmail ? <Text style={styles.adminEmailText}>{adminEmail}</Text> : null}
          </View>
          <TouchableOpacity style={styles.lockBtn} onPress={handleExitAdmin} activeOpacity={0.8}>
            <Text style={styles.lockBtnText}>🔒 Lock & Exit</Text>
          </TouchableOpacity>
        </View>
        <Banner color="blue" icon={<Icon name="idCard" size={14} color={colors.blue} />}>
          Golden Hour Administrative Gateway — Professional Credential Verification Desk.
        </Banner>
        <View style={{ height: 16 }} />

        {/* Stats Row - Clickable filters */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveTab('PENDING_DOCTORS')}
            activeOpacity={0.7}
          >
            <Card style={[styles.statCard, activeTab === 'PENDING_DOCTORS' && styles.statCardActive]}>
              <Text style={styles.statNumber}>{pendingDoctors.length}</Text>
              <Text style={styles.statLabel}>Pending Doctors</Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveTab('ACTIVE_DOCTORS')}
            activeOpacity={0.7}
          >
            <Card style={[styles.statCard, activeTab === 'ACTIVE_DOCTORS' && styles.statCardActive]}>
              <Text style={[styles.statNumber, { color: colors.success }]}>{approvedDoctors.length}</Text>
              <Text style={styles.statLabel}>Active Doctors</Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.7}
          >
            <Card style={[styles.statCard, activeTab === 'ALL' && styles.statCardActive]}>
              <Text style={[styles.statNumber, { color: colors.inkSoft }]}>{applications.length}</Text>
              <Text style={styles.statLabel}>Total Reviews</Text>
            </Card>
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <Chip
            label={`Pending (${pendingDoctors.length})`}
            selected={activeTab === 'PENDING_DOCTORS'}
            onPress={() => setActiveTab('PENDING_DOCTORS')}
          />
          <View style={{ width: 8 }} />
          <Chip
            label={`Active Doctors (${approvedDoctors.length})`}
            selected={activeTab === 'ACTIVE_DOCTORS'}
            onPress={() => setActiveTab('ACTIVE_DOCTORS')}
          />
          <View style={{ width: 8 }} />
          <Chip
            label={`Hospitals (${pendingHospitals.length > 0 ? `${pendingHospitals.length} new` : allHospitals.length})`}
            selected={activeTab === 'HOSPITALS'}
            onPress={() => setActiveTab('HOSPITALS')}
          />
          <View style={{ width: 8 }} />
          <Chip
            label={`Ambulances (${pendingDrivers.length > 0 ? `${pendingDrivers.length} new` : allDrivers.length})`}
            selected={activeTab === 'AMBULANCES'}
            onPress={() => setActiveTab('AMBULANCES')}
          />
          <View style={{ width: 8 }} />
          <Chip
            label={`ASHA / Workers (${pendingWorkers.length > 0 ? `${pendingWorkers.length} new` : allWorkers.length})`}
            selected={activeTab === 'WORKERS'}
            onPress={() => setActiveTab('WORKERS')}
          />
          <View style={{ width: 8 }} />
          <Chip
            label={`All Reviews (${applications.length})`}
            selected={activeTab === 'ALL'}
            onPress={() => setActiveTab('ALL')}
          />
        </ScrollView>

        {loading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.red} />
            <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>Loading applications...</Text>
          </View>
        )}

        {/* Pending Doctors Tab */}
        {!loading && activeTab === 'PENDING_DOCTORS' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>Pending Doctor Verifications</HTitle>
              <Pill color={pendingDoctors.length > 0 ? 'amber' : 'grey'}>
                {pendingDoctors.length} Action Required
              </Pill>
            </View>

            {pendingDoctors.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="check" size={28} color={colors.success} />
                <Text style={styles.emptyTitle}>Queue All Clear!</Text>
                <Text style={styles.emptySub}>
                  There are no pending doctor verification requests at this time.
                </Text>
              </Card>
            ) : (
              pendingDoctors.map(app => renderDoctorCard(app))
            )}
          </View>
        )}

        {/* Active / Approved Doctors Tab */}
        {!loading && activeTab === 'ACTIVE_DOCTORS' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>Active & Verified Doctors</HTitle>
              <Pill color={approvedDoctors.length > 0 ? 'success' : 'grey'}>
                {approvedDoctors.length} Verified
              </Pill>
            </View>

            {approvedDoctors.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="doctor" size={28} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Active Doctors Yet</Text>
                <Text style={styles.emptySub}>
                  When you approve a doctor's credentials, they will be listed here. You can view their details or revoke their access anytime.
                </Text>
              </Card>
            ) : (
              approvedDoctors.map(app => renderDoctorCard(app))
            )}
          </View>
        )}

        {/* All Reviews Tab */}
        {!loading && activeTab === 'ALL' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>All Professional Submissions</HTitle>
              <Pill color="grey">{applications.length} Total</Pill>
            </View>

            {applications.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="idCard" size={28} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Submissions Found</Text>
                <Text style={styles.emptySub}>Applications will appear here.</Text>
              </Card>
            ) : (
              applications.map(app => {
                const r = (app.role || '').toUpperCase();
                if (r === 'HOSPITAL') return renderHospitalCard(app);
                if (r === 'AMBULANCE_DRIVER') return renderDriverCard(app);
                if (r === 'FRONTLINE_WORKER' || r === 'ASHA') return renderWorkerCard(app);
                return renderDoctorCard(app);
              })
            )}
          </View>
        )}

        {/* Hospitals Tab */}
        {!loading && activeTab === 'HOSPITALS' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>Hospital Verification Desk</HTitle>
              <Pill color={pendingHospitals.length > 0 ? 'amber' : 'success'}>
                {pendingHospitals.length > 0
                  ? `${pendingHospitals.length} Action Required`
                  : `${approvedHospitals.length} Active`}
              </Pill>
            </View>

            {allHospitals.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="hospital" size={32} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Hospital Applications</Text>
                <Text style={styles.emptySub}>
                  When a hospital administrator submits registration, their facility details will appear here for review.
                </Text>
              </Card>
            ) : (
              allHospitals.map(hosp => renderHospitalCard(hosp))
            )}
          </View>
        )}

        {/* Ambulance Drivers Tab */}
        {!loading && activeTab === 'AMBULANCES' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>Ambulance Drivers & Crew Fleet</HTitle>
              <Pill color={pendingDrivers.length > 0 ? 'amber' : 'success'}>
                {pendingDrivers.length > 0
                  ? `${pendingDrivers.length} Action Required`
                  : `${approvedDrivers.length} Active`}
              </Pill>
            </View>

            {allDrivers.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="ambulance" size={32} color={colors.inkSoft} />
                <Text style={styles.emptyTitle}>No Ambulance Applications</Text>
                <Text style={styles.emptySub}>
                  When an ambulance driver submits their registration, their driving license and vehicle credentials will appear here for verification.
                </Text>
              </Card>
            ) : (
              allDrivers.map(drv => renderDriverCard(drv))
            )}
          </View>
        )}

        {/* ASHA / Frontline Workers Tab */}
        {!loading && activeTab === 'WORKERS' && (
          <View>
            <View style={styles.sectionHeader}>
              <HTitle size={16}>ASHA & ANM Frontline Workers</HTitle>
              <Pill color={pendingWorkers.length > 0 ? 'amber' : 'success'}>
                {pendingWorkers.length > 0
                  ? `${pendingWorkers.length} Action Required`
                  : `${approvedWorkers.length} Active`}
              </Pill>
            </View>

            {allWorkers.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>🌾</Text>
                <Text style={styles.emptyTitle}>No Frontline Worker Applications</Text>
                <Text style={styles.emptySub}>
                  When an ASHA or ANM worker registers with their PHC and government ID, their application will appear here for review and verification.
                </Text>
              </Card>
            ) : (
              allWorkers.map(w => renderWorkerCard(w))
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Gate Styles ──────────────────────────────────────────────────────────────

const gateStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 18, left: 20, flexDirection: 'row', alignItems: 'center', padding: 8, zIndex: 10 },
  backArrow: { fontSize: 30, lineHeight: 30, color: '#1A1A1A', marginRight: 5 },
  backText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  logo: { width: 80, height: 80, marginBottom: 8 },
  shieldWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shieldIcon: { fontSize: 34 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  cardSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  googleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  googleG: { color: '#fff', fontWeight: '800', fontSize: 14 },
  googleText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  notice: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 },
  returnLink: { fontSize: 14, color: '#4285F4', fontWeight: '600', marginTop: 12 },
});

// ─── Dashboard Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: colors.red },
  statLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  appCard: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  docName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  docSpec: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  detailsGrid: { flexDirection: 'row', gap: 16, marginTop: 10 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.inkSoft, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.ink, marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: 14 },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  statCardActive: {
    borderColor: colors.red,
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  revokeButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  revokeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  revokeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  adminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  adminBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  adminEmailText: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  lockBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  lockBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
