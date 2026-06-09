import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Pick an image from the library (SDK 54 API: mediaTypes is an array).
 * Returns the picked asset uri, or null if cancelled / denied.
 */
export function useImagePicker(deniedMessage: string) {
  const [picking, setPicking] = useState(false);

  const pick = async (): Promise<{ uri: string } | null> => {
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', deniedMessage);
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return null;
      return { uri: result.assets[0].uri };
    } finally {
      setPicking(false);
    }
  };

  return { pick, picking };
}
