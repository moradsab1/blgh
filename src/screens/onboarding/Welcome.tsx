import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, MapPin, Radio } from '../../core/icons';
import { color, space, radius } from '../../core/theme/tokens';
import { Text, Button } from '../../core/theme/components';
import { haptics } from '../../core/haptics';
import { useReduceMotion } from '../../core/a11y/useReduceMotion';
import { strings } from '../../core/strings';
import { useLangStore } from '../../domain/stores/lang';
import type { WelcomeProps } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }: WelcomeProps): React.ReactElement => {
  const { lang } = useLangStore();
  const s = strings[lang];
  const reduceMotion = useReduceMotion();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    { key: 'slide1', title: s.welcome.slide1.title, subtitle: s.welcome.slide1.subtitle, icon: Radio, checks: undefined },
    { key: 'slide2', title: s.welcome.slide2.title, subtitle: s.welcome.slide2.subtitle, icon: MapPin, checks: undefined },
    {
      key: 'slide3',
      title: s.welcome.slide3.title,
      subtitle: s.welcome.slide3.subtitle,
      icon: Shield,
      checks: [s.welcome.slide3.check1, s.welcome.slide3.check2, s.welcome.slide3.check3, s.welcome.slide3.check4],
    },
  ];

  type Slide = typeof slides[number];

  const flatListRef = useRef<FlatList<Slide>>(null);

  const goNext = (): void => {
    haptics.toggle();
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
      setCurrentIndex(next);
    } else {
      navigation.replace('Locality', {});
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

  const renderSlide = ({ item }: { item: Slide }): React.ReactElement => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <Icon size={64} color={color.accent} />
        </View>
        <Text variant="heading" style={styles.title}>
          {item.title}
        </Text>
        <Text secondary style={styles.subtitle}>
          {item.subtitle}
        </Text>
        {item.checks && (
          <View style={styles.checks}>
            {item.checks.map(check => (
              <View key={check} style={styles.checkRow}>
                <Text style={styles.checkMark}>✓</Text>
                <Text secondary style={styles.checkText}>
                  {check}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false });
          });
        }}
        style={styles.flatList}
      />

      <View style={styles.dots}>
        {slides.map((slide, i) => {
          const isActive = i === currentIndex;
          return (
            <TouchableOpacity
              key={slide.key}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1} / ${slides.length}`}
              hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
              onPress={() => {
                haptics.toggle();
                flatListRef.current?.scrollToIndex({ index: i, animated: !reduceMotion });
                setCurrentIndex(i);
              }}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button
          label={isLastSlide ? s.welcome.start : s.welcome.next}
          onPress={goNext}
          fullWidth
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4),
    gap: space(3),
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: color.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(2),
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    color: color.textPrimary,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: space(2),
  },
  checks: {
    width: '100%',
    gap: space(1.5),
    marginTop: space(1),
  },
  checkRow: {
    flexDirection: 'row',
    gap: space(1.5),
    alignItems: 'flex-start',
  },
  checkMark: {
    color: color.status.calm,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  checkText: {
    flex: 1,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space(1),
    paddingVertical: space(2),
  },
  dot: {
    height: 8,
    borderRadius: radius.pill,
  },
  dotActive: {
    width: 24,
    backgroundColor: color.accent,
  },
  dotInactive: {
    width: 8,
    backgroundColor: color.border,
  },
  footer: {
    paddingHorizontal: space(3),
    paddingBottom: space(4),
  },
  cta: {
    borderRadius: radius.lg,
  },
});

export default WelcomeScreen;
