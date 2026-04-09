import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/lib/theme';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
  },
});
