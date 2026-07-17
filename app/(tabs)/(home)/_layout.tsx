import { TabGroupStack } from '@/components/TabGroupStack';

export const unstable_settings = { initialRouteName: 'index' };

export default function HomeGroupLayout() {
  return <TabGroupStack initial="index" />;
}
