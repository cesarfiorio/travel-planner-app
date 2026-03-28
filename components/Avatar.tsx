import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function Avatar({ name, imageUrl, size = 88 }: AvatarProps) {
  const { t } = useTranslation('common');
  const diameter = size;
  const initials = initialsFromName(name);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        }}
        accessibilityLabel={t('profilePhotoFor', { name })}
      />
    );
  }

  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={t('avatarInitialsFor', { name })}
    >
      <Text
        style={{
          fontSize: diameter * 0.35,
          fontWeight: '700',
          color: '#374151',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
