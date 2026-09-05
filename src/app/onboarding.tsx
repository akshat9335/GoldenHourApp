import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🚨',
    title: 'Report an Emergency',
    description:
      'Report an accident instantly with your location. Anyone nearby can help when every second matters.',
  },
  {
    id: '2',
    icon: '📍',
    title: 'Get Help Faster',
    description:
      'Connect emergencies with nearby responders and registered hospitals for faster emergency coordination.',
  },
  {
    id: '3',
    icon: '🩹',
    title: 'Help When It Matters',
    description:
      'Get AI-powered first-aid guidance, emergency alerts and real-time support when you need it most.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / width
    );

    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      router.replace('/role-selection');
    }
  };

  const handleSkip = () => {
    router.replace('/role-selection');
  };

  return (
    <View style={styles.container}>
      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconOuter}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>

            <Text style={styles.description}>
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1
              ? 'Get Started'
              : 'Next'}
          </Text>

          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  skipButton: {
    position: 'absolute',
    top: 55,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },

  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 100,
  },

  iconOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 45,
  },

  iconCircle: {
    width: 145,
    height: 145,
    borderRadius: 72.5,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },

  icon: {
    fontSize: 62,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },

  description: {
    fontSize: 16,
    lineHeight: 25,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 340,
  },

  bottomSection: {
    position: 'absolute',
    bottom: 38,
    left: 24,
    right: 24,
    alignItems: 'center',
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },

  activeDot: {
    width: 25,
    backgroundColor: '#D32F2F',
  },

  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 22,
    marginLeft: 10,
  },
});