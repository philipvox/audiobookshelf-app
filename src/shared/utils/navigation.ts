import { NavigationProp } from '@react-navigation/native';

export function safeGoBack(navigation: NavigationProp<any>) {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('Main' as never);
  }
}