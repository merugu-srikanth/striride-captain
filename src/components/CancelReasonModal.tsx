import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

const PINK = '#E91E8C';

export const CAPTAIN_CANCEL_REASONS = [
  'Rider is not reachable',
  'Rider asked me to cancel',
  'Rider not at pickup location',
  'Wrong pickup location',
  'Vehicle breakdown',
  'Other',
];

interface CancelReasonModalProps {
  visible: boolean;
  reasons: string[];
  submitting?: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
}

export default function CancelReasonModal({
  visible,
  reasons,
  submitting,
  onDismiss,
  onConfirm,
}: CancelReasonModalProps) {
  const [selected, setSelected]         = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const isOther    = selected === 'Other';
  const canConfirm = !!selected && (!isOther || customReason.trim().length > 0);

  const handleDismiss = () => {
    setSelected(null);
    setCustomReason('');
    onDismiss();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(isOther ? customReason.trim() : selected!);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} statusBarTranslucent onRequestClose={handleDismiss}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="items-center mb-3">
            <View className="w-10 h-[5px] rounded-full bg-gray-200" />
          </View>

          <Text className="text-lg font-black text-gray-900 mb-1">Cancel ride?</Text>
          <Text className="text-sm text-gray-500 mb-4">Let us know why — this helps us improve</Text>

          {reasons.map((r) => {
            const active = selected === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setSelected(r)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between px-4 py-3.5 rounded-2xl mb-2 border"
                style={{
                  borderColor: active ? PINK : '#E5E7EB',
                  backgroundColor: active ? PINK + '10' : '#fff',
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: active ? PINK : '#374151' }}>
                  {r}
                </Text>
                {active && <MaterialCommunityIcons name="check-circle" size={18} color={PINK} />}
              </TouchableOpacity>
            );
          })}

          {isOther && (
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="Tell us more…"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-[#F9F8FF] rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 mb-2"
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
          )}

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canConfirm || submitting}
            activeOpacity={0.85}
            className="h-14 rounded-2xl items-center justify-center mt-3"
            style={{ backgroundColor: canConfirm ? '#EF4444' : '#F3F4F6' }}
          >
            <Text className="text-base font-bold" style={{ color: canConfirm ? '#fff' : '#9CA3AF' }}>
              {submitting ? 'Cancelling…' : 'Confirm Cancellation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} disabled={submitting} className="items-center py-3.5 mt-1">
            <Text className="text-sm font-semibold text-gray-500">Never mind, keep ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
