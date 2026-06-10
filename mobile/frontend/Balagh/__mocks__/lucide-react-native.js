/**
 * Jest manual mock for `lucide-react-native`.
 *
 * Lucide renders through react-native-svg (a native module), which isn't
 * available under jest. Any icon imported from the package resolves to a
 * lightweight View stub via a Proxy, so `import { AnyIcon } from
 * 'lucide-react-native'` always works in tests.
 */

'use strict';

const React = require('react');
const { View } = require('react-native');

const Icon = (props) =>
  React.createElement(View, { testID: props && props.testID });

module.exports = new Proxy(
  {},
  {
    get: (_target, name) => {
      if (name === '__esModule') return true;
      return Icon;
    },
  },
);
