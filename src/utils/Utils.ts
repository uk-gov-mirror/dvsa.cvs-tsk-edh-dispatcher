/**
 * Utils functions
 */
import { Configuration } from './Configuration';
import { ERROR } from '../models/enums';
import { Target, TargetConfig } from '../models/interfaces';

export const getTargetFromSourceARN = (arn: string): Target => {
  const targets: TargetConfig = Configuration.getInstance().getTargets();
  const validTargets = Object.keys(targets).filter((k) => arn.includes(k));
  if (validTargets.length !== 1) {
    throw new Error(ERROR.NO_UNIQUE_TARGET);
  }
  return targets[validTargets[0]];
};
