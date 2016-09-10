/* eslint no-console: [2, { allow: ["error"] }] */
import { Meteor } from 'meteor/meteor';
import launchApp from './launchApp';
import createBinaries from './createBinaries';

const settings = Meteor.settings.electronBuilder || {};

if (process.env.NODE_ENV === 'development') {
  // Promise is returned
  createBinaries
    .then(packageJSON => {
      if (packageJSON) launchApp(packageJSON);
    })
    .catch(err => console.error(err));
}
