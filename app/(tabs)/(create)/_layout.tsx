import { TabGroupStack } from '@/components/TabGroupStack';

export const unstable_settings = { initialRouteName: 'create' };

export default function CreateGroupLayout() {
  return <TabGroupStack initial="create" />;
}
