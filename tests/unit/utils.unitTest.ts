import { types } from 'util';
import { getTargetFromSourceARN } from '../../src/utils/Utils';
import { Configuration } from '../../src/utils/Configuration';
import { ERROR } from '../../src/models/enums';

describe('Utils', () => {
  describe('getTargetFromSourceARN', () => {
    describe('when ARN has a matching config', () => {
      it('gets target from config properly', () => {
        const expected = Configuration.getInstance().getTargets()['test-results'];
        const target = getTargetFromSourceARN('arn:aws:sqs:eu-west-1:006106226016:cvs-test-results-cvsb-10773-queue');
        expect(target).toEqual(expected);
      });
    });

    describe('when ARN has no matching config', () => {
      it('throws error', () => {
        try {
          getTargetFromSourceARN('arn:aws:dynamodb:horse-east-8:00626016:table/cvs-cvsb-xxx-NO-MATCHING/stream/2024-03-30T15:55:39.197');
        } catch (e) {
          if (types.isNativeError(e)) {
            expect(e.message).toEqual(ERROR.NO_UNIQUE_TARGET);
          } else {
            fail('Error is not a native error.');
          }
        }
      });
    });
  });
});
