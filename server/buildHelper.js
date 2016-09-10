import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import childProcess from 'child_process';
import { Platform } from 'electron-builder';
import lucyDirsum from 'lucy-dirsum';
import { EJSON } from 'meteor/ejson';
import * as _ from 'lodash';

export const stat = Meteor.wrapAsync(fs.stat);
export const dirsum = Meteor.wrapAsync(lucyDirsum);

export const exec = Meteor.wrapAsync((command, options, callback) => {
  childProcess.exec(command, options, (err, stdout, stderr) => callback(err, { stdout, stderr }));
});

export const readJson = jsonPath => {
  try {
    return EJSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return {};
  }
};

export const jsonHasChanged = (leftPath, right) => !_.isEqual(readJson(leftPath), right);

export const projectRoot = () => {
  let projectRootPath;
  if (process.platform === 'win32') {
    projectRootPath = process.env.METEOR_SHELL_DIR.split('.meteor')[0];
  } else {
    projectRootPath = process.env.PWD;
  }
  return projectRootPath;
};

export const dirHasChanged = (srcDir, checksum) => {
  let hasChanged = true;
  let existingAppChecksum;
  try {
    existingAppChecksum = fs.readFileSync(checksum, 'utf8');
  } catch (e) {
    // No existing checksum.
  }

  const appChecksum = dirsum(srcDir);
  if (appChecksum !== existingAppChecksum) {
    fs.writeFileSync(checksum, appChecksum);
    hasChanged = true;
  }
  return hasChanged;
};

export const createTargets = (targets = [], current) => {
  let t = current ? new Map([...Platform.current().createTarget()]) : new Map();
  _.forEach(targets, target => {
    const nextTarget = Platform[target].createTarget();
    t = new Map([...nextTarget, ...t]);
  });
  return t;
};

