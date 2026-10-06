import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import { useDraftState } from '@/hooks/useDraftState';
import { newPlanRequestId } from '@/lib/personalPlan';
import { errorMessage } from '@/lib/formErrors';
import { ApiError } from '@/api/client';
import { useTranslation } from '@/i18n';
import { colors, getActiveScheme } from '@/constants/theme';
import { AppPressable } from '@/components/ui/AppPressable';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

/** Mounted outside the router stack so opening chat never replaces the current page. */
export function FloatingCoachChat({ footerVisible = true }: { footerVisible?: boolean }) {
  'use no memo';
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const { messages, load, send, busy, isLoading, error } = useCoachStore();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const key = `coach-${userId}`;
  const [text, setText] = useDraftState(key + '-text', '');
  const [requestId, setRequestId] = useDraftState(key + '-send', newPlanRequestId);
  const [failed, setFailed] = useDraftState(key + '-chat-failed', false);
  const [localError, setLocalError] = useState<string | null>(null);
  const lock = useRef(false);
  const history = useRef<ScrollView>(null);
  const blocked = busy || isLoading;
  const dark = getActiveScheme() === 'dark';
  const current = () => useAuthStore.getState().isAuthenticated && useAuthStore.getState().user?.id === userId;
  async function submit() {
    if (lock.current || blocked || failed || !text.trim()) return;
    lock.current = true; setLocalError(null); setRequestId(requestId);
    try {
      await send(requestId, text);
      if (current()) { setText(''); setRequestId(newPlanRequestId()); setFailed(false); }
    } catch (e) {
      if (current()) {
        setLocalError(errorMessage(e));
        if (e instanceof ApiError && typeof e.details === 'object' && e.details !== null && 'code' in e.details && e.details.code === 'COACH_REQUEST_FAILED') setFailed(true);
      }
    } finally { lock.current = false; }
  }
  if (!authenticated || !userId) return null;
  return <>
    {!open ? <AppPressable appearance='plain' accessibilityRole='button' accessibilityLabel={t('Mở trò chuyện với PT')} onPress={() => { setOpen(true); void load(); }}
      style={{ position: 'absolute', right: 16, bottom: insets.bottom + (footerVisible ? 80 : 20), width: 58, height: 58, borderRadius: 29, backgroundColor: dark ? '#101010' : colors.primary, borderWidth: dark ? 2 : 0, borderColor: '#FFD277', alignItems: 'center', justifyContent: 'center', elevation: 6, boxShadow: `0 4px 14px ${colors.overlay}` }}>
      <Ionicons name='chatbubble-ellipses-outline' size={27} color={dark ? '#FFD277' : colors.onPrimary} />
    </AppPressable> : null}
    <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay, paddingTop: insets.top + 12 }}>
        <AppPressable appearance='plain' accessibilityRole='button' accessibilityLabel={t('Đóng trò chuyện với PT')} onPress={() => setOpen(false)} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ height: Math.max(220, height * 0.78 - insets.top), maxHeight: '90%', flexShrink: 1, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: Math.max(insets.bottom, 12), gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{t('PT AI của bạn')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('Tư vấn dựa trên hồ sơ và khảo sát của bạn')}</Text></View>
            <AppPressable accessibilityRole='button' accessibilityLabel={t('Thu gọn trò chuyện')} onPress={() => setOpen(false)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }}>
              <Ionicons name='chevron-down' size={24} color={colors.text} />
            </AppPressable>
          </View>
          <ScrollView ref={history} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 8 }} keyboardShouldPersistTaps='handled' onContentSizeChange={() => history.current?.scrollToEnd({ animated: true })}>
            {messages.length ? messages.map(message => <View key={message.id} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '94%', padding: 12, borderRadius: 16, backgroundColor: message.role === 'user' ? colors.primarySoft : colors.surfaceMuted }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{t(message.role === 'user' ? 'Bạn' : 'PT AI')} · {message.createdAt.replace('T', ' ').slice(0, 16)}</Text>
              <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{message.content}</Text>
            </View>) : <Text style={{ color: colors.textMuted }}>{t('Hỏi PT về vận động, bữa ăn hoặc kế hoạch của bạn.')}</Text>}
            {blocked ? <ActivityIndicator color={colors.primary} accessibilityLabel={t('PT đang xử lý.')} /> : null}
          </ScrollView>
          <ErrorBanner message={localError ?? error} />
          {failed ? <Button title={t('Bắt đầu yêu cầu AI mới')} variant='secondary' disabled={blocked} onPress={() => { setRequestId(newPlanRequestId()); setFailed(false); setLocalError(null); useCoachStore.setState({ error: null }); }} /> : null}
          {error && !failed ? <Button title={t('Tải lại PT')} variant='secondary' disabled={blocked} onPress={() => { setLocalError(null); void load(); }} /> : null}
          <TextField label={t('Tin nhắn cho PT')} value={text} multiline maxLength={2000} editable={!blocked} style={{ maxHeight: 100 }} onChangeText={value => { setText(value); setRequestId(newPlanRequestId()); setFailed(false); setLocalError(null); }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{text.length}/2000</Text>
            <View style={{ flex: 1 }}><Button title={t('Gửi tin nhắn')} disabled={blocked || failed || !text.trim()} onPress={() => void submit()} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
