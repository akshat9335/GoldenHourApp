import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Icon } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';

interface ContactItem {
  id: string;
  name: string;
  crisisId?: string;
  relationship?: string;
  phone?: string;
}

export default function ContactsSetup() {
  const draft = useAppStore((s) => s.registrationDraft);
  const clearDraft = useAppStore((s) => s.clearRegistrationDraft);
  const profileExists = useAppStore((s) => s.profileExists);
  const userProfile = useAppStore((s) => s.userProfile);

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.users.getEmergencyContacts();
      if (Array.isArray(res)) {
        setContacts(
          res.map((c: any) => ({
            id: c.id,
            name: c.name || c.crisisId || 'Emergency Contact',
            crisisId: c.crisisId,
            relationship: c.relationship || 'Emergency Contact',
            phone: c.phone || '',
          }))
        );
      } else {
        setContacts([]);
      }
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAdd = async () => {
    const rawCrisisId = identifier.trim().toUpperCase();
    if (!rawCrisisId) {
      Alert.alert('Required', 'Please enter a Golden Hour ID (e.g. AS-4821).');
      return;
    }

    try {
      setSaving(true);
      const newContact = await api.users.addEmergencyContact({
        crisisId: rawCrisisId,
      });

      if (newContact) {
        setContacts((prev) => [
          ...prev,
          {
            id: newContact.id || `c-${Date.now()}`,
            name: newContact.name || rawCrisisId,
            crisisId: newContact.crisisId || rawCrisisId,
            relationship: 'Emergency Contact',
          },
        ]);
        Alert.alert('Success', `Added ${newContact.name || rawCrisisId} to emergency contacts.`);
      }
      setIdentifier('');
      setShowAdd(false);
    } catch (err: any) {
      Alert.alert('Cannot Add Contact', err?.message || 'Could not add emergency contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.users.deleteEmergencyContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete contact.');
    }
  };

  const isAlreadyRegistered = profileExists || !!userProfile;

  return (
    <Screen>
      <TopBar title="Emergency Contacts" />
      <Text style={styles.sub}>These contacts are notified automatically via FCM push alerts when you activate SOS.</Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.red} style={{ marginVertical: 20 }} />
      ) : contacts.length === 0 ? (
        <Card style={{ padding: 20, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: colors.inkSoft, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            No emergency contacts added yet.{'\n'}Tap "+ Add Contact" below and enter their Crisis ID.
          </Text>
        </Card>
      ) : (
        contacts.map((c) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.name?.[0]?.toUpperCase() || 'C'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.rel}>Crisis ID: {c.crisisId}</Text>
            </View>
            <Pressable onPress={() => handleDelete(c.id)} hitSlop={8} style={{ padding: 4 }}>
              <Icon name="close" size={14} color={colors.inkFaint} />
            </Pressable>
          </Card>
        ))
      )}

      {showAdd ? (
        <Card style={styles.addForm}>
          <Text style={styles.formTitle}>Add Emergency Contact</Text>
          <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginBottom: 2 }}>
            Enter their Golden Hour ID. Their name will be linked automatically from their profile.
          </Text>
          <TextInput
            placeholder="Golden Hour ID (e.g. AS-4821)"
            placeholderTextColor={colors.inkFaint}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Button
              title="Cancel"
              variant="ghost"
              style={{ flex: 1 }}
              onPress={() => {
                setShowAdd(false);
                setIdentifier('');
              }}
            />
            <Button
              title={saving ? 'Verifying & Adding…' : 'Add Contact'}
              style={{ flex: 1 }}
              onPress={handleAdd}
              disabled={saving}
            />
          </View>
        </Card>
      ) : (
        <Button
          title="+ Add Contact by Golden Hour ID"
          variant="secondary"
          style={{ marginBottom: 16 }}
          onPress={() => setShowAdd(true)}
        />
      )}

      {isAlreadyRegistered ? (
        <Button
          title="Done"
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
        />
      ) : (
        <Button
          title={submitting ? "Saving Profile…" : "Continue"}
          disabled={submitting}
          onPress={async () => {
            try {
              setSubmitting(true);
              const emergencyContacts = contacts.map((c) => ({
                name: c.name,
                phone: c.phone || c.crisisId || '',
                relationship: c.relationship || 'Emergency Contact',
              }));

              const payload = {
                name: draft.name || 'Golden Hour User',
                email: draft.email,
                phone: draft.phone,
                role: 'PATIENT',
                dateOfBirth: draft.dateOfBirth,
                gender: draft.gender,
                age: draft.age,
                address: draft.address || draft.homeAddress,
                bloodGroup: draft.bloodGroup,
                allergies: draft.allergies,
                chronicConditions: draft.chronicConditions,
                currentMedications: draft.currentMedications,
                emergencyContacts,
              };

              await authService.register(payload);
              clearDraft();
              router.push('/permissions');
            } catch (err: any) {
              console.warn('[ContactsSetup] Failed to register profile:', err);
              Alert.alert('Registration Error', err?.message || 'Failed to complete registration. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginBottom: 16 },
  card: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.red, fontWeight: '800' },
  name: { fontWeight: '700', fontSize: 13, color: colors.ink },
  rel: { fontSize: 11, color: colors.inkFaint },
  addForm: { padding: 16, marginBottom: 16, gap: 10 },
  formTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: '#fff',
  },
});
