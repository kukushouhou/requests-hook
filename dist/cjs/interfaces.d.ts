export interface ProxyOptions {
    proxyXHR?: boolean;
    proxyFetch?: boolean;
    onRequest?: (config: RequestConfig) => void;
    onResponse?: (response: RequestResponse, handler: ResponseHandler) => void;
    onError?: (err: RequestError, handler: ErrorHandler) => void;
}
export interface RequestConfig {
    method: string;
    url: string | URL;
    headers: any;
    body: any;
    async?: boolean;
    username?: string | null | undefined;
    password?: string | null | undefined;
    withCredentials: boolean;
    type: 'XMLHttpRequest' | 'fetch';
    xhr?: XMLHttpRequest;
    fetch?: Request;
}
export interface RequestResponse {
    config: RequestConfig;
    headers: Record<string, string | string[]>;
    response: any;
    responseText: string;
    responseXML: Document | null;
    responseClone?: Response;
    status: number;
    statusText?: string;
}
interface _Handler {
    resolve(response: RequestResponse): void;
    reject(err: RequestError): void;
}
export interface RequestHandler extends _Handler {
    next(config: RequestConfig): void;
}
export interface ResponseHandler extends _Handler {
    next(response: RequestResponse): void;
}
export interface ErrorHandler extends _Handler {
    next(error: RequestError): void;
}
type RequestErrorType = 'error' | 'timeout' | 'abort';
export interface RequestError {
    config: RequestConfig;
    type: RequestErrorType;
}
export {};
