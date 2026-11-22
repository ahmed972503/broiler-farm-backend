import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function UsersManagementScreen() {
  const { colors, typography, spacing } = useTheme();

  const [users, setUsers] = useState<any[]>([]);
  const [sheds, setSheds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create User Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("worker123");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("0300");
  const [role, setRole] = useState<"admin" | "worker">("worker");
  const [assignedShedId, setAssignedShedId] = useState("");
  const [submittingUser, setSubmittingUser] = useState(false);

  // Reset Password Modal
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  // Reassign Shed Modal
  const [reassignWorker, setReassignWorker] = useState<any | null>(null);
  const [selectedNewShedId, setSelectedNewShedId] = useState<string | null>(null);
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const getShedDisplayName = (u: any) => {
    if (u.assignedShedId && typeof u.assignedShedId === "object" && u.assignedShedId.name) {
      return u.assignedShedId.name;
    }
    const shedId = u.assignedShedId?.id || u.assignedShedId?._id || (typeof u.assignedShedId === "string" ? u.assignedShedId : null);
    if (!shedId) return "Koi shed assign nahi";
    const found = sheds.find((s) => (s.id && s.id === shedId) || (s._id && s._id === shedId));
    return found ? found.name : "Shed";
  };

  const handleOpenReassign = (user: any) => {
    setReassignWorker(user);
    const curr = user.assignedShedId?.id || user.assignedShedId?._id || user.assignedShedId || null;
    setSelectedNewShedId(curr);
  };

  const handleSaveReassign = async () => {
    if (!reassignWorker) return;
    setSubmittingReassign(true);
    try {
      const workerId = reassignWorker.id || reassignWorker._id;
      if (selectedNewShedId) {
        await apiFetch(`/api/sheds/${selectedNewShedId}`, {
          method: "PUT",
          body: JSON.stringify({ assignedWorkerId: workerId }),
        });
      }
      setReassignWorker(null);
      loadData();
      Alert.alert("Success", "Worker shed assignment updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update assignment");
    } finally {
      setSubmittingReassign(false);
    }
  };

  const loadData = async () => {
    try {
      const userRes = await apiFetch("/api/auth/users");
      if (userRes.success && userRes.data) setUsers(userRes.data);

      const shedRes = await apiFetch("/api/sheds");
      if (shedRes.success && shedRes.data) {
        setSheds(shedRes.data);
        if (!assignedShedId && shedRes.data.length > 0)
          setAssignedShedId(shedRes.data[0].id || shedRes.data[0]._id);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async () => {
    if (!username.trim() || !name.trim() || !password.trim()) {
      Alert.alert("Required", "Username, name, and password are required.");
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await apiFetch("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password.trim(),
          name: name.trim(),
          phone: phone.trim(),
          role,
          assignedShedId: role === "worker" ? assignedShedId : null,
        }),
      });

      if (res.success) {
        Alert.alert("User Created", `User ${username} created successfully.`);
        setShowCreateForm(false);
        setUsername("");
        setName("");
        loadData();
      } else {
        Alert.alert("Error", res.error || "Failed to create user");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Required", "New password must be at least 6 characters.");
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          userId: resetUserId,
          newPassword,
        }),
      });

      if (res.success) {
        Alert.alert("Password Updated", "User password has been reset.");
        setResetUserId(null);
        setNewPassword("");
      } else {
        Alert.alert("Error", res.error || "Failed to reset password");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            User Management (Users Ka Intizam)
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Manage farm admin and shed worker credentials & assignments
          </Text>
        </View>

        <Button
          title={showCreateForm ? "Cancel" : "+ New User"}
          size="sm"
          onPress={() => setShowCreateForm(!showCreateForm)}
        />
      </View>

      {/* Create User Form */}
      {showCreateForm ? (
        <Card
          elevated
          style={{ borderColor: colors.primary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Create Farm User Account
          </Text>
          <Input
            label="Username"
            placeholder="e.g. worker5"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Input
            label="Full Name"
            placeholder="e.g. Asghar Ali"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Phone Number"
            placeholder="0300-1234567"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Initial Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text
            style={{
              color: colors.text,
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 6,
            }}
          >
            Role:
          </Text>
          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            {(["worker", "admin"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor:
                      role === r ? colors.primary : colors.surface,
                    borderColor: role === r ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: role === r ? colors.white : colors.text,
                    fontWeight: "700",
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {role === "worker" ? (
            <View style={{ marginBottom: 10 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Assign Shed:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {sheds.map((s) => {
                  const sId = s.id || s._id;
                  const isSelected = assignedShedId === sId;
                  return (
                    <TouchableOpacity
                      key={sId}
                      onPress={() => setAssignedShedId(sId)}
                      style={[
                        styles.shedChip,
                        {
                          backgroundColor: isSelected
                            ? colors.secondary
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.secondary
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.white : colors.text,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Button
            title="Create User"
            onPress={handleCreateUser}
            loading={submittingUser}
          />
        </Card>
      ) : null}

      {/* Password Reset Modal */}
      {resetUserId ? (
        <Card
          elevated
          style={{ borderColor: colors.secondary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.secondary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            Reset Password for User
          </Text>
          <Input
            label="New Password (min 6 chars)"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setResetUserId(null)}
              style={{ flex: 0.48 }}
            />
            <Button
              title="Save New Password"
              variant="secondary"
              onPress={handleResetPassword}
              loading={submittingReset}
              style={{ flex: 0.48 }}
            />
          </View>
        </Card>
      ) : null}

      {/* Users List */}
      {users.map((u, idx) => (
        <Card key={u.id || u._id || u.username || `user-${idx}`} elevated style={{ marginVertical: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
              >
                {u.name} ({u.username})
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Phone: {u.phone} •{" "}
                {u.role === "admin"
                  ? "Farm Administrator"
                  : `Assigned: ${getShedDisplayName(u)}`}
              </Text>
            </View>

            <Badge
              label={u.role.toUpperCase()}
              variant={u.role === "admin" ? "info" : "success"}
            />
          </View>

          {u.role === "worker" ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Button
                title="Assign / Change Shed"
                variant="outline"
                size="sm"
                onPress={() => handleOpenReassign(u)}
                style={{ flex: 1 }}
              />
              <Button
                title="Reset Password"
                variant="outline"
                size="sm"
                onPress={() => setResetUserId(u._id || u.id)}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button
              title="Reset Password"
              variant="outline"
              size="sm"
              onPress={() => setResetUserId(u._id || u.id)}
              style={{ marginTop: 8 }}
            />
          )}
        </Card>
      ))}

      {/* Reassign Shed Modal */}
      <Modal
        visible={!!reassignWorker}
        transparent
        animationType="fade"
        onRequestClose={() => setReassignWorker(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 14,
              padding: 20,
              maxWidth: 480,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
                Assign Shed to {reassignWorker?.name}
              </Text>
              <TouchableOpacity onPress={() => setReassignWorker(null)}>
                <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
              Muntakhib karein ke yeh worker kis shed ka in-charge hoga:
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {sheds.map((s) => {
                const sId = s._id || s.id;
                const isSelected = selectedNewShedId === sId;
                return (
                  <TouchableOpacity
                    key={sId}
                    onPress={() => setSelectedNewShedId(sId)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isSelected ? colors.white : colors.text,
                      }}
                    >
                      {s.name} ({Number(s.capacity).toLocaleString()} birds)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Save Assignment"
              onPress={handleSaveReassign}
              loading={submittingReassign}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  shedChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
});
