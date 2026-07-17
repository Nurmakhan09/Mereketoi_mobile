import { TabGroupStack } from '@/components/TabGroupStack';
import { Colors } from '@/constants/theme';
import { useI18n } from '@/locales';

export const unstable_settings = { initialRouteName: 'calendar' };

export default function CalendarGroupLayout() {
  const { t } = useI18n();
  return (
    <TabGroupStack
      initial="calendar"
      // Small centered dark native header — same look as Параметрлер/Таңдаулы/
      // Хабарламалар (replaces the old big left-aligned blue in-screen heading).
      initialOptions={{
        headerShown: true,
        title: t.calendarTitle,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
