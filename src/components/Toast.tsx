import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'error' | 'success' | 'info';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

const DEFAULT_DURATION = 3500;

const TYPE_STYLES: Record<
  ToastType,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; tint: string }
> = {
  error:   { icon: 'alert-circle',      accent: '#EF4444', tint: '#FEF2F2' },
  success: { icon: 'check-circle',       accent: '#16A34A', tint: '#F0FDF4' },
  info:    { icon: 'information',        accent: '#E91E8C', tint: '#FFF0F9' },
};

interface ToastContextValue {
  show: (config: Partial<ToastConfig> & Pick<ToastConfig, 'title'>) => void;
  error: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateOut = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback<ToastContextValue['show']>(
    (config) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const next: ToastConfig = {
        type: config.type ?? 'info',
        title: config.title,
        message: config.message,
        duration: config.duration ?? DEFAULT_DURATION,
      };
      setToast(next);
      translateY.setValue(-120);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(animateOut, next.duration);
    },
    [animateOut, opacity, translateY],
  );

  const error = useCallback<ToastContextValue['error']>((title, message) => show({ type: 'error', title, message }), [show]);
  const success = useCallback<ToastContextValue['success']>((title, message) => show({ type: 'success', title, message }), [show]);
  const info = useCallback<ToastContextValue['info']>((title, message) => show({ type: 'info', title, message }), [show]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const styles = toast ? TYPE_STYLES[toast.type] : null;

  return (
    <ToastContext.Provider value={{ show, error, success, info, hide: animateOut }}>
      {children}
      {toast && styles && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            transform: [{ translateY }],
            opacity,
          }}
        >
          <Pressable
            onPress={animateOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderLeftWidth: 4,
              borderLeftColor: styles.accent,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: styles.tint,
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name={styles.icon} size={20} color={styles.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>{toast.title}</Text>
              {!!toast.message && (
                <Text style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{toast.message}</Text>
              )}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
