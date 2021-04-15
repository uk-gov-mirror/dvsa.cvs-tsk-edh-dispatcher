export enum ERROR {
  NO_UNIQUE_TARGET = 'Unable to determine unique target',
  NO_SQS_CONFIG = 'SQS config is not defined in the config file.',
  FAILED_Q_URL = 'Failed to retrieve SQS Queue URL',
  SECRET_STRING_EMPTY = 'SecretString is empty.',
  SECRET_ENV_VAR_NOT_SET = 'SECRET_NAME environment variable not set.',
  NO_BRANCH_ENV = 'BRANCH environment variable not set',
  FAILED_VALIDATION_SENDING_TO_DLQ = 'Failed validation on event. Sending to DLQ',
  NO_NEW_IMAGE = 'Stream record had no new image.',
  NO_OLD_IMAGE = 'Stream record had no old image.'
}
