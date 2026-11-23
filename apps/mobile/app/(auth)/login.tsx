import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  StatusBar as RNStatusBar,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { Button, Input, Card } from "../../src/components/ui";
import { useAuthStore } from "../../src/store/useAuthStore";
import {
  apiFetch,
  getApiBaseUrl,
  setApiBaseUrl,
  testServerConnection,
  initApiBaseUrl,
} from "../../src/api/client";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { colors, spacing, typography, borderRadius, mode, toggleTheme } =
    useTheme();
  const { setAuth } = useAuthStore();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android"
      ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 24)
      : insets.top;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    initApiBaseUrl().then((url) => setServerUrlInput(url));
  }, []);

  const handleTestServer = async () => {
    setTestingServer(true);
    setTestResult(null);
    const res = await testServerConnection(serverUrlInput);
    setTestResult(res);
    setTestingServer(false);
  };

  const handleSaveServerUrl = async () => {
    await setApiBaseUrl(serverUrlInput);
    setShowServerModal(false);
    setError(null);
  };

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallGuide((prev) => !prev);
    }
  };

  const handleLogin = async (userVal?: string, passVal?: string) => {
    const u = userVal || username;
    const p = passVal || password;

    if (!u.trim() || !p.trim()) {
      setError(t("auth.invalidCredentials"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: u.trim(), password: p.trim() }),
      });

      if (res.success && res.data) {
        await setAuth(
          res.data.user,
          res.data.accessToken,
          res.data.refreshToken,
        );
      } else {
        setError(res.error || t("auth.invalidCredentials"));
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check network.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: "admin" | "worker") => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
      handleLogin("admin", "admin123");
    } else {
      setUsername("worker1");
      setPassword("worker123");
      handleLogin("worker1", "worker123");
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ur" ? "en" : "ur";
    changeLanguage(nextLang);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: statusBarHeight + 16,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Top Controls: Theme, Language & Server */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              setServerUrlInput(getApiBaseUrl());
              setTestResult(null);
              setShowServerModal(true);
            }}
            style={[
              styles.chipButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="server-outline" size={13} color={colors.primary} />
            <Text
              style={{
                marginLeft: 4,
                color: colors.text,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              Server
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleLanguage}
            style={[
              styles.chipButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              {i18n.language === "ur" ? "English" : "اردو (Roman)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.chipButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons
              name={mode === "dark" ? "sunny-outline" : "moon-outline"}
              size={13}
              color={colors.text}
            />
            <Text
              style={{
                marginLeft: 4,
                color: colors.text,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              {mode === "dark" ? "Light" : "Dark"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.brandTitle,
              { color: colors.text, fontSize: typography.sizes.xxl },
            ]}
          >
            {t("common.appName")}
          </Text>
          <Text
            style={[
              styles.brandSubtitle,
              { color: colors.textSecondary, fontSize: typography.sizes.sm },
            ]}
          >
            Al-Barakah Broiler Farm • Pakistan
          </Text>
        </View>

        {/* Login Form Card */}
        <Card style={styles.formCard} elevated>
          <Text
            style={[
              styles.formTitle,
              { color: colors.text, fontSize: typography.sizes.lg },
            ]}
          >
            {t("auth.login")}
          </Text>

          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.dangerBg,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: colors.danger, fontSize: typography.sizes.sm },
                ]}
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setServerUrlInput(getApiBaseUrl());
                  setTestResult(null);
                  setShowServerModal(true);
                }}
                style={{
                  marginTop: 8,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  backgroundColor: colors.surface,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="settings-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: typography.sizes.xs,
                    marginLeft: 4,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  Configure Server URL / IP
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Input
            label={t("auth.username")}
            placeholder="e.g. admin or worker1"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label={t("auth.password")}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title={loading ? t("auth.loggingIn") : t("auth.loginButton")}
            onPress={() => handleLogin()}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          {/* Quick Demo Access Buttons (Development Only) */}
          {Boolean(typeof __DEV__ !== "undefined" && __DEV__) && (
            <>
              <View style={styles.divider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.dividerText,
                    { color: colors.textMuted, fontSize: typography.sizes.xs },
                  ]}
                >
                  ONE-CLICK DEMO ACCESS (DEV ONLY)
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              </View>

              <View style={styles.demoButtonsRow}>
                <Button
                  title="Admin (Owner)"
                  variant="outline"
                  size="sm"
                  onPress={() => handleQuickDemo("admin")}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Worker (Shed 1)"
                  variant="outline"
                  size="sm"
                  onPress={() => handleQuickDemo("worker")}
                  style={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>
            </>
          )}
          {/* PWA Mobile Install Banner (Web Only) */}
          {Platform.OS === "web" && (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={26}
                  color={colors.primary}
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    {i18n.language === "ur"
                      ? "Mobile App Install Karein"
                      : "Install Mobile App"}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {i18n.language === "ur"
                      ? "Bina Play Store ya account ke direct phone par save karein"
                      : "Install on mobile home screen for offline access"}
                  </Text>
                </View>
              </View>

              <Button
                title={
                  i18n.language === "ur"
                    ? "Phone par Install Karein"
                    : "Install on Phone"
                }
                variant="primary"
                size="sm"
                onPress={handleInstallClick}
              />

              {showInstallGuide && (
                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: typography.sizes.xs,
                      lineHeight: 20,
                      fontWeight: "500",
                    }}
                  >
                    {i18n.language === "ur"
                      ? "1. Chrome me ooper daayein 3 dots (⋮) par tap karein.\n2. 'Install app' ya 'Add to Home screen' par click karein.\n3. App aapke mobile par install ho kar offline chalegi!"
                      : "1. Tap the 3 dots (⋮) in your Chrome browser.\n2. Tap 'Install app' or 'Add to Home screen'.\n3. The app is installed and works offline!"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevated>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="server-outline"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.sizes.lg,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  Server Connection
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sizes.xs,
                marginBottom: 14,
                lineHeight: 18,
              }}
            >
              Enter backend API URL. Make sure your PC running the API (`npm start`)
              and mobile phone are connected to the SAME Wi-Fi network.
            </Text>

            <Input
              label="Backend Server URL"
              placeholder="http://192.168.100.19:5000"
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Presets */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                marginBottom: 6,
                fontWeight: "600",
              }}
            >
              Quick Presets:
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 14,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setServerUrlInput(
                    "https://broiler-farm-backend-3g4r-aag-d348.vercel.app"
                  )
                }
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="cloud-outline"
                    size={12}
                    color={colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Vercel Cloud (Live)
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setServerUrlInput(
                    "https://broiler-farm-backend-3g4r-seven.vercel.app"
                  )
                }
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="cloud-outline"
                    size={12}
                    color={colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    Vercel (Seven)
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setServerUrlInput("http://192.168.100.19:5000")}
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    fontWeight: "500",
                  }}
                >
                  PC Wi-Fi (192.168.100.19)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setServerUrlInput("http://10.0.2.2:5000")}
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Emulator (10.0.2.2)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setServerUrlInput("http://localhost:5000")}
                style={[
                  styles.presetChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Localhost
                </Text>
              </TouchableOpacity>
            </View>

            {testResult ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: testResult.success
                    ? "#ECFDF5"
                    : colors.dangerBg,
                  borderColor: testResult.success ? "#10B981" : colors.danger,
                  borderWidth: 1,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: testResult.success ? "#065F46" : colors.danger,
                    fontSize: typography.sizes.xs,
                    fontWeight: "600",
                  }}
                >
                  {testResult.success ? "✓ " : "✗ "}
                  {testResult.message}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title={testingServer ? "Testing..." : "Test Ping"}
                variant="outline"
                onPress={handleTestServer}
                style={{ flex: 1 }}
                disabled={testingServer}
              />
              <Button
                title="Save & Connect"
                onPress={handleSaveServerUrl}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  chipButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontWeight: "800",
    textAlign: "center",
  },
  brandSubtitle: {
    marginTop: 4,
    textAlign: "center",
  },
  formCard: {
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    padding: 24,
  },
  formTitle: {
    fontWeight: "700",
    marginBottom: 16,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontWeight: "600",
  },
  demoButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
