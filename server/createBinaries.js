/* eslint no-console: [2, { allow: ["error"] }] */
import { Meteor } from 'meteor/meteor';
import path from 'path';
import builder from 'electron-builder';
import util from 'util';
import mkdirp from 'mkdirp';
import _ncp from 'ncp';
import rimraf from 'rimraf';
import fs from 'fs';
import * as _ from 'lodash';
import {
  projectRoot,
  createTargets,
  dirHasChanged,
  readJson,
  exec,
  jsonHasChanged,
} from './buildHelper';

const ncp = Meteor.wrapAsync(_ncp);

const electronSettings = Meteor.settings.electron || {};
const electronBuilderSettings = Meteor.settings.electronBuilder || {};

/* Entry Point */
const createBinaries = new Promise((resolve, reject) => {
  const resolvedAppSrcDir = path.join(process.cwd(), 'assets', 'packages', 'risetechnologies_electron', 'app');
  const resolvedAppSettingsPath = path.join(resolvedAppSrcDir, 'package.json');

  // Check if the package.json has changed before copying over the app files, to account for
  // changes made in the app source dir.
  const defaultAppSettings = readJson(resolvedAppSettingsPath);
  /* Write out Electron Settings */
  const defaults = {
    name: (electronSettings.name || 'electron').toLowerCase().replace(/\s/g, '-'),
  };
  const appSettings = _.defaults(defaultAppSettings, defaults, electronSettings, {
    rootUrl: process.env.ROOT_URL,
  });

  const projectDir = path.join(projectRoot(), '.meteor-electron');
  const devSettings = _.defaults(electronBuilderSettings, {
    devMetadata: {},
    projectDir,
  });

  // enforce some fields
  devSettings.devDependencies = { electron: '1.3.5' };
  devSettings.electronVersion = '1.3.5';
  devSettings.projectDir = projectDir;
  _.set(devSettings, 'devMetadata.directories.app', path.join(projectDir, 'app'));
  if (!_.has(devSettings, 'devMetadata.directories.output')) {
    _.set(devSettings, 'devMetadata.directories.output', path.join(projectDir, 'output'));
  }
  devSettings.targets = createTargets(devSettings.targets, devSettings.autoRun);
  const appDir = devSettings.devMetadata.directories.app;
  const buildResourcesDir = devSettings.devMetadata.directories.buildResources;
  const outputDir = devSettings.devMetadata.directories.output;

  if (_.isEmpty(devSettings.targets)) {
    console.error('No builds available for this platform.');
  }

  let buildRequired = false;
  let didOverwriteNodeModules = false;

  // Check if the package has changed before we possibly copy over the app source since that will
  // of course sync `package.json`.
  const appChecksumPath = path.join(projectDir, 'appChecksum.txt');
  if (dirHasChanged(resolvedAppSrcDir, appChecksumPath)) {
    buildRequired = true;
    rimraf.sync(outputDir);
    // Copy the app directory over while also pruning old files.
    if (process.platform === 'darwin') {
      // Ensure that the app source directory ends in a slash so we copy its contents.
      // Except node_modules from pruning since we prune that below.
      // TODO(wearhere): `rsync` also uses checksums to only copy what's necessary so theoretically we
      // could always `rsync` rather than checking if the directory's changed first.
      exec(util.format('rsync -a --delete --force --filter="P node_modules" "%s" "%s"',
        path.join(resolvedAppSrcDir, '/'), appDir));
    } else {
      // TODO(wearhere): More efficient sync on Windows (where `rsync` isn't available.)
      rimraf.sync(appDir);
      mkdirp.sync(appDir);
      ncp(resolvedAppSrcDir, appDir);
      didOverwriteNodeModules = true;
    }
  }

  const devSettingsPath = path.join(projectDir, 'package.json');
  if (jsonHasChanged(devSettingsPath, devSettings)) {
    buildRequired = true;
    rimraf.sync(devSettingsPath);
    fs.writeFileSync(devSettingsPath, JSON.stringify(devSettings));
    exec('npm install && npm prune', { cwd: projectDir });
  }

  const appSettingsPath = path.join(appDir, 'package.json');
  if (jsonHasChanged(appSettingsPath, appSettings) || didOverwriteNodeModules) {
    buildRequired = true;
    rimraf.sync(appSettingsPath);
    fs.writeFileSync(appSettingsPath, JSON.stringify(appSettings));
    exec('npm install && npm prune', { cwd: appDir });
  }

  // detect if buildResources have changed and enforce a rebuild in case
  const buildResourcesChecksum = path.join(projectDir, 'buildResourcesChecksum.txt');
  if (dirHasChanged(buildResourcesDir, buildResourcesChecksum)) buildRequired = true;

  const buildInfo = {
    output: outputDir,
    name: appSettings.name,
    buildRequired: buildRequired && devSettings.autoRun,
  };

  /* Create Build */
  if (buildRequired) {
    // Promise is returned
    builder.build(devSettings)
      .then(() => {
        resolve(buildInfo);
      })
      .catch(error => reject(error));
  } else {
    resolve(buildInfo);
  }
});

export default createBinaries;
