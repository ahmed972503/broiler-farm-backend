import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
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

  const loadData = async () => {
    try {
      const userRes = await apiFetch("/api/auth/users");
      if (userRes.success && userRes.data) setUsers(userRes.data);

      const shedRes = await apiFetch("/api/sheds");
      if (shedRes.success && shedRes.data) {
        setSheds(shedRes.data);
        if (!assignedShedId && shedRes.data.length > 0)
          setAssignedShedId(shedRes.data[0]._id);
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
                {sheds.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    onPress={() => setAssignedShedId(s._id)}
                    style={[
                      styles.shedChip,
                      {
                        backgroundColor:
                          assignedShedId === s._id
                            ? colors.secondary
                            : colors.surface,
                        borderColor:
                          assignedShedId === s._id
                            ? colors.secondary
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          assignedShedId === s._id ? colors.white : colors.text,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
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
      {users.map((u) => (
        <Card key={u._id} elevated style={{ marginVertical: 6 }}>
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
                  : `Assigned: ${u.assignedShedId?.name || "Shed"}`}
              </Text>
            </View>

            <Badge
              label={u.role.toUpperCase()}
              variant={u.role === "admin" ? "info" : "success"}
            />
          </View>

          <Button
            title="Reset Password"
            variant="outline"
            size="sm"
            onPress={() => setResetUserId(u._id)}
            style={{ marginTop: 8 }}
          />
        </Card>
      ))}
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
