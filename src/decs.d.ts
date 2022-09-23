declare module 'openapi-enforcer' {
  export function Enforcer(definition: string): Promise<OpenAPI>;

  export class OpenAPI {
    components: {
      schemas: {
        [key: string]: {
          deserialize(value: any): EnforcerResult;
          validate(value: any): EnforcerException | undefined;
        };
      };
    };
  }
  interface EnforcerResult {
    error: EnforcerException;
    value: undefined;
    warning: EnforcerException;
  }

  interface EnforcerException {
    count: number;
    hasException: boolean;
    at(path: string): EnforcerException;
    /** @deprecated */
    clearCache(): EnforcerException;
    nest(header: string): EnforcerException;
    merge(exception: EnforcerException): EnforcerException;
    message(message: string): void;
    push(value: string | EnforcerException): EnforcerException;
  }
}
