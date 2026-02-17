declare module 'mssql' {
  export interface IResult<T> {
    recordset: T[];
    rowsAffected: number[];
    output: any;
  }

  export interface IConfig {
    server: string;
    database: string;
    user: string;
    password: string;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
      enableArithAbort?: boolean;
      appName?: string;
    };
    pool?: {
      max?: number;
      min?: number;
      idleTimeoutMillis?: number;
    };
    connectionString?: string;
  }

  export interface ConnectionPool {
    query<T = any>(command: string): Promise<IResult<T>>;
    request(): Request;
    close(): Promise<void>;
  }

  export interface Request {
    input(name: string, value: any): Request;
    query<T = any>(command: string): Promise<IResult<T>>;
  }

  export function connect(config: IConfig | string): Promise<ConnectionPool>;

  export const pool: any;
  export const poolPromise: any;
}
