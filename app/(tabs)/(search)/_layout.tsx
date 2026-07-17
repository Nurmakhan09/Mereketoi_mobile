import { TabGroupStack } from '@/components/TabGroupStack';

export const unstable_settings = { initialRouteName: 'search' };

export default function SearchGroupLayout() {
  return <TabGroupStack initial="search" />;
}
