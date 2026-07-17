import { TabGroupStack } from '@/components/TabGroupStack';

export const unstable_settings = { initialRouteName: 'profile' };

export default function ProfileGroupLayout() {
  return <TabGroupStack initial="profile" />;
}
