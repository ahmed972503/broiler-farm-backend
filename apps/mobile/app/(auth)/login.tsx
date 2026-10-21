import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../src/theme';
import { Button, Input, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/useAuthStore';
import { apiFetch } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../src/i18n';

export default function LoginScreen() {
  const { colors, spacing, typography, borderRadius, mode, toggleTheme } = useTheme();
  const { setAuth } = useAuthStore();
  const { t, i18n } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (userVal?: string, passVal?: string) => {
    const u = userVal || username;
    const p = passVal || password;

    if (!u.trim() || !p.trim()) {
      setError(t('auth.invalidCredentials'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u.trim(), password: p.trim() })
      });

      if (res.success && res.data) {
        await setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      } else {
        setError(res.error || t('auth.invalidCredentials'));
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'admin' | 'worker') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      handleLogin('admin', 'admin123');
    } else {
      setUsername('worker1');
      setPassword('worker123');
      handleLogin('worker1', 'worker123');
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ur' ? 'en' : 'ur';
    changeLanguage(nextLang);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Controls: Theme & Language */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={[styles.chipButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.text, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold }}>
              {i18n.language === 'ur' ? 'English' : 'اردو (Roman)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.chipButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.text, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold }}>
              {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoIcon}>🐓</Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.text, fontSize: typography.sizes.xxl }]}>
            {t('common.appName')}
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
            Al-Barakah Broiler Farm • Pakistan
          </Text>
        </View>

        {/* Login Form Card */}
        <Card style={styles.formCard} elevated>
          <Text style={[styles.formTitle, { color: colors.text, fontSize: typography.sizes.lg }]}>
            {t('auth.login')}
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
              <Text style={[styles.errorText, { color: colors.danger, fontSize: typography.sizes.sm }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Input
            label={t('auth.username')}
            placeholder="e.g. admin or worker1"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label={t('auth.password')}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title={loading ? t('auth.loggingIn') : t('auth.loginButton')}
            onPress={() => handleLogin()}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          {/* Quick Demo Access Buttons */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: typography.sizes.xs }]}>
              ONE-CLICK DEMO ACCESS
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.demoButtonsRow}>
            <Button
              title="Admin (Owner)"
              variant="outline"
              size="sm"
              onPress={() => handleQuickDemo('admin')}
              style={{ flex: 1, marginRight: spacing.xs }}
            />
            <Button
              title="Worker (Shed 1)"
              variant="outline"
              size="sm"
              onPress={() => handleQuickDemo('worker')}
              style={{ flex: 1, marginLeft: spacing.xs }}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16
  },
  chipButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  logoIcon: {
    fontSize: 34
  },
  brandTitle: {
    fontWeight: '800',
    textAlign: 'center'
  },
  brandSubtitle: {
    marginTop: 4,
    textAlign: 'center'
  },
  formCard: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    padding: 24
  },
  formTitle: {
    fontWeight: '700',
    marginBottom: 16
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16
  },
  errorText: {
    fontWeight: '500'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    marginHorizontal: 10,
    fontWeight: '600'
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});
