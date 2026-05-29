import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { color } from '../core/theme/tokens';
import { Text } from '../core/theme/components';

import SplashScreen from '../screens/Splash';
import LanguageScreen from '../screens/onboarding/Language';
import WelcomeScreen from '../screens/onboarding/Welcome';
import LocalityScreen from '../screens/onboarding/Locality';
import SettingsScreen from '../screens/settings/Settings';
import MapScreen from '../screens/Map';

const StubScreen = (): React.ReactElement => (
  <View style={stubStyles.c}>
    <Text secondary>قريبًا — المرحلة القادمة</Text>
  </View>
);
const stubStyles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg } });

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.ReactElement => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: color.bg },
      animation: 'slide_from_right',
    }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Language" component={LanguageScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen
      name="Locality"
      component={LocalityScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <Stack.Screen name="Map" component={MapScreen} />
    <Stack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen name="Inbox" component={StubScreen} />
    <Stack.Screen name="ReportCategory" component={StubScreen} />
    <Stack.Screen name="ReportDetails" component={StubScreen} initialParams={{ category: '' }} />
    <Stack.Screen name="ReportSuccess" component={StubScreen} initialParams={{ ref: '' }} />
    <Stack.Screen name="CrisisReassure" component={StubScreen} />
    <Stack.Screen name="CrisisCategory" component={StubScreen} />
    <Stack.Screen name="CrisisConfirm" component={StubScreen} initialParams={{ category: '' }} />
    <Stack.Screen name="CrisisSuccess" component={StubScreen} initialParams={{ ref: '' }} />
    <Stack.Screen name="FollowUp" component={StubScreen} initialParams={{ ref: '' }} />
    <Stack.Screen name="PrivacyConstitution" component={StubScreen} />
    <Stack.Screen name="About" component={StubScreen} />
  </Stack.Navigator>
);
