module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@nativescript/react-native/babel-plugin', 'react-native-worklets/plugin'],
  };
};
