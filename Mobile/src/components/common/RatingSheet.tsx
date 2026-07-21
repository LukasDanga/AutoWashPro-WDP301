/**
 * RatingSheet — shared star-rating + comment composer used by:
 *   • app/(tabs)/history.tsx (modal in the booking detail modal)
 *   • app/booking/[id]/feedback.tsx (dedicated feedback screen)
 *
 * Single source of truth for the rating UX (stars, label copy, color,
 * validation rules, and submit logic) so the two surfaces stay in lock-step
 * with the FE HistoryPage behavior.
 *
 * Visual + a11y rules:
 *   - 1..5 stars; 0 is "not rated yet".
 *   - Rating < 1 disables submit.
 *   - Comment is optional, max 500 chars.
 *   - Stars + label color follow the same semantic mapping the FE uses.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';
import { Icon, Icons } from './Icon';

export interface RatingSheetProps {
  visible: boolean;
  initialRating?: number;
  initialComment?: string;
  /**
   * Async submit handler. Receives the (rating, comment) tuple and is
   * expected to throw on failure so the sheet can show the error inline.
   */
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
  /** Override the heading. Defaults to "Đánh giá dịch vụ". */
  title?: string;
}

const RATING_LABELS: Record<number, string> = {
  0: 'Chạm để đánh giá',
  1: 'Rất không hài lòng',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

function ratingColorKey(rating: number, colors: any): string {
  switch (rating) {
    case 1: return colors.error;
    case 2: return colors.warning;
    case 3: return colors.textSecondary;
    case 4: return colors.primary;
    case 5: return colors.success;
    default: return colors.textSecondary;
  }
}

export const RatingSheet: React.FC<RatingSheetProps> = ({
  visible,
  initialRating = 0,
  initialComment = '',
  onSubmit,
  onClose,
  title = 'Đánh giá dịch vụ',
}) => {
  const colors = useColors();
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Re-seed local state whenever the sheet becomes visible — supports
  // both "first time" and "edit existing rating" flows from the caller.
  useEffect(() => {
    if (visible) {
      setRating(initialRating || 0);
      setComment(initialComment || '');
      setError('');
      setSubmitting(false);
    }
  }, [visible, initialRating, initialComment]);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Vui lòng chọn số sao');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(rating, comment.trim());
    } catch (e: any) {
      setError(e?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const labelColor = ratingColorKey(rating, colors);
  const labelText = RATING_LABELS[rating] || RATING_LABELS[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.sheet, { backgroundColor: colors.background }]}
          activeOpacity={1}
          accessibilityViewIsModal
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceDark }]}
              accessibilityLabel="Đóng"
            >
              <Icon name={Icons.close} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Chất lượng dịch vụ
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Đánh giá ${s} sao`}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.star, { color: s <= rating ? '#F59E0B' : colors.border }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.label, { color: labelColor }]}>
                {labelText}
              </Text>
            )}

            <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              Nhận xét (tùy chọn)
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              maxLength={500}
              multiline
              placeholder="Chia sẻ trải nghiệm của bạn..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {comment.length}/500
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                <Text style={{ color: colors.error, ...typography.caption }}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.footerRow}>
              <Button title="Hủy" variant="outline" onPress={onClose} disabled={submitting} style={{ flex: 1 }} />
              <Button
                title={submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                onPress={handleSubmit}
                disabled={submitting || rating < 1}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
  },
  subtitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  star: {
    fontSize: 28,
  },
  label: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 12,
  },
  errorBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default RatingSheet;