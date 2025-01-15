import {ProxyOptions, RequestConfig, RequestError, RequestResponse, ResponseHandler} from "./interfaces";

declare global {
    interface Window {
        XMLHttpRequest: typeof XMLHttpRequest; // 使用具体的类型
    }
}

const ProxyPropResponse = ['response', 'responseText', 'responseXML', 'status', 'statusText'];
const ProxyGetPropWhiteList = [
    'open',
    'send',
    'setRequestHeader',
    'getResponseHeader',
    'getAllResponseHeaders',
    'dispatchEvent',
    'addEventListener',
    'removeEventListener',
    'onreadystatechange',
    'onload',
    'onloadend',
]
const ProxyEventList = ['readystatechange', 'load', 'loadend'];


export default function proxyXHR(options: ProxyOptions, win: Window) {
    const {XMLHttpRequest: OriginXMLHttpRequest} = win;

    class ProxyXMLHttpRequest extends OriginXMLHttpRequest {
        _requestConfig: RequestConfig;
        _response: RequestResponse;
        _originXhr: XMLHttpRequest;
        _eventListeners: { [key: string]: Array<(e: Event) => void> };
        _lastReadyState: number;

        constructor() {
            super();

            this._originXhr = new OriginXMLHttpRequest();
            this._eventListeners = {};
            this._lastReadyState = 0;
            // 绑定原始的xhr的各种事件

            this._requestConfig = {
                url: '',
                body: null,
                headers: {},
                method: '',
                withCredentials: this.withCredentials,
                type: 'XMLHttpRequest',
                xhr: this._originXhr
            };

            this._response = {
                config: this._requestConfig,
                headers: {},
                response: null,
                responseText: '',
                responseXML: null,
                status: 0,
                statusText: ''
            };

            const ths = new Proxy(this, {set: this._set, get: this._get});
            this._originXhr.addEventListener("readystatechange", this._originReadyStateChange.bind(ths));

            // 注册自身的proxy,所有属性设置都经过proxy,不需要设置到自身，直接设置到_originXhr中
            return ths;
        }

        private _get(target: this, prop: string | symbol): any {
            // console.log("ProxyXMLHttpRequest _get", prop);
            if (typeof prop === 'string' && ProxyPropResponse.includes(prop)) {
                return (target._response as any)[prop];
            } else if (typeof prop === 'string' && (ProxyGetPropWhiteList.includes(prop) || prop.startsWith("_"))) {
                const result = Reflect.get(target, prop);
                if (typeof result === 'function' && !prop.startsWith('on')) {
                    return result.bind(target);
                }
                return result;
            }
            const result = (target._originXhr as any)[prop];
            if (typeof result === 'function' && (typeof prop !== "string" || !prop.startsWith('on')) && OriginXMLHttpRequest.prototype.hasOwnProperty(prop)) {
                // 自带的方法，需要补充绑定到_originXhr上，否则调用会报错
                return result.bind(target._originXhr);
            }
            return result;
        }

        private _setToOrigin(prop: string | symbol) {
            if (typeof prop === 'string') {
                if (prop.startsWith('on')) {
                    const eventName = prop.slice(2);
                    return !ProxyEventList.includes(eventName)
                }
            }
            return true;
        }

        private _set(target: this, prop: string | symbol, value: any): boolean {
            // console.log("ProxyXMLHttpRequest _set", prop, value);
            if (typeof prop === "string" && ProxyPropResponse.includes(prop)) {
                (target._response as any)[prop] = value;
            }
            if (prop === 'withCredentials') {
                target._requestConfig.withCredentials = value;
            }
            if (target._setToOrigin(prop)) {
                try {
                    (target._originXhr as any)[prop] = value;
                } catch (e) {
                    // 可能会因为只读属性写入失败，那不需要同步
                }
            }
            try {
                return Reflect.set(target, prop, value);
            } catch (e) {
                // 可能会因为只读属性写入失败，那不需要同步
                return false;
            }
        }

        private _ready() {
            this._response.status = this._originXhr.status;
            this._response.statusText = this._originXhr.statusText;
            this._response.response = getResponseContent(this._originXhr);
            this._response.responseText = this._originXhr.responseText;
            if (!this._originXhr.responseType || this._originXhr.responseType === 'document') {
                try {
                    this._response.responseXML = this._originXhr.responseXML;
                } catch (e) {
                }
            }
            this._response.headers = getResponseHeaders(this._originXhr);
            if (options.onResponse) {
                try {
                    options.onResponse(this._response, this._createResponseHandler());
                    return false;
                } catch (e) {
                    console.error(e);
                }
            }
            return true;
        }

        private _createEvent(type: string) {
            const newEvent = new Event(type, {bubbles: true, cancelable: true});
            Object.defineProperty(newEvent, 'target', {value: this, writable: false});
            Object.defineProperty(newEvent, 'currentTarget', {value: this, writable: false});
            Object.defineProperty(newEvent, 'srcElement', {value: this, writable: false});
            return newEvent;
        }

        private _dispatch(type: string) {
            if (type === 'readystatechange') {
                if (this._lastReadyState === this._originXhr.readyState) {
                    // readystatechange事件，如果readyState没有变化，则不派发事件，因为如果多次hook，readystatechange事件会多次触发，照成死循环递归
                    return;
                }
                this._lastReadyState = this._originXhr.readyState;
            }
            const event_handler = this._eventListeners[type];
            const event_handler_name = `on${type}`;
            const event_on_handler = (this as any)[event_handler_name];
            if (event_on_handler || event_handler?.length) {
                const event = this._createEvent(type);
                event_on_handler?.(event);
                event_handler?.forEach(item => item(event));
            }
        }

        private _createResponseHandler(): ResponseHandler {
            const ths = this;
            const result: ResponseHandler = {
                next(response: RequestResponse) {
                },
                resolve(response: RequestResponse) {
                    ths._response = response;
                    ths._dispatch('readystatechange');
                    ths._dispatch('load');
                    ths._dispatch('loadend');
                },
                reject(error: RequestError) {
                    // TODO reject时的处理
                    throw Error('[Not implemented]尚未实现');
                }
            }
            result.next = result.resolve;
            return result;
        }


        private _originReadyStateChange() {
            // console.log("ProxyXMLHttpRequest _originReadyStateChange", this._originXhr.readyState, this._originXhr, this);
            const readyState = this._originXhr.readyState;
            if (readyState === 4) {
                if (!this._ready()) {
                    // 拦截器返回false，不继续执行由拦截器手动控制下一步
                    return;
                }
            }
            this._dispatch('readystatechange');
            if (readyState === 4) {
                this._dispatch('load');
                this._dispatch('loadend');
            }
        }

        addEventListener = <K extends keyof XMLHttpRequestEventMap>(type: K, listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any, options?: boolean | AddEventListenerOptions) => {
            // console.log("ProxyXMLHttpRequest addEventListener", type, listener, options);
            if (ProxyEventList.includes(type)) {
                if (!(type in this._eventListeners)) {
                    this._eventListeners[type] = [];
                }
                this._eventListeners[type].push(listener as any);
            } else {
                this._originXhr.addEventListener(type, listener, options);
            }
            // console.log('addEventListener end', this);
        }

        removeEventListener = <K extends keyof XMLHttpRequestEventMap>(type: K, listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any, options?: boolean | EventListenerOptions) => {
            // console.log("ProxyXMLHttpRequest removeEventListener", type, listener, options);
            if (ProxyEventList.includes(type)) {
                const index = this._eventListeners[type].indexOf(listener as any);
                if (index !== -1) {
                    this._eventListeners[type].splice(index, 1);
                }
            } else {
                this._originXhr.removeEventListener(type, listener, options);
            }
        }

        open = (method: string, url: string | URL, async?: boolean, username?: string | null | undefined, password?: string | null | undefined) => {
            // console.log("ProxyXMLHttpRequest open", method, url, async, username, password);
            this._requestConfig.method = method;
            this._requestConfig.url = url;
            this._requestConfig.async = async ?? true;
            this._requestConfig.username = username;
            this._requestConfig.password = password;
            if (options.onRequest && !this._requestConfig.async) {
                // TODO 如果不是异步，则在此时便需要拦截
                throw Error('[Not implemented]尚未实现');
            } else {
                this._originXhr.open(method, url, async ?? true, username, password);
            }
        }

        send = (body?: Document | XMLHttpRequestBodyInit | null) => {
            // console.log("ProxyXMLHttpRequest send", body);
            this._requestConfig.body = body;
            this._requestConfig.withCredentials = this.withCredentials;
            if (options.onRequest) {
                // TODO 拦截send，进行请求拦截
                throw Error('[Not implemented]尚未实现');
            } else {
                this._originXhr.send(body);
            }
        }

        setRequestHeader = (name: string, value: string) => {
            // console.log("ProxyXMLHttpRequest setRequestHeader", name, value);
            this._requestConfig.headers[name] = value;
            this._originXhr.setRequestHeader(name, value);
        }

        getResponseHeader = (name: string) => {
            // console.log("ProxyXMLHttpRequest getResponseHeader", name);
            const header = this._response?.headers[name.toLowerCase()];
            if (header !== undefined) {
                if (Array.isArray(header)) {
                    // 如果服务器返回多个同名的响应头，getResponseHeader 会将这些值拼接成一个字符串，中间用逗号分隔。大多数现代浏览器（如 Chrome、Firefox、Safari 和 Edge）都遵循这一行为
                    return header.join(',');
                }
                return header;
            }
            return null;
        }

        getAllResponseHeaders = () => {
            // console.log("ProxyXMLHttpRequest getAllResponseHeaders");
            const headers = this._response?.headers;
            const headerLines: string[] = [];
            for (const [key, value] of Object.entries(headers)) {
                if (Array.isArray(value)) {
                    value.forEach(v => headerLines.push(`${key}: ${v}`));
                } else {
                    headerLines.push(`${key}: ${value}`);
                }
            }
            return headerLines.join('\r\n');
        }
    }

    win.XMLHttpRequest = ProxyXMLHttpRequest as any;
}

function getResponseHeaders(xhr: XMLHttpRequest) {
    const headers = xhr.getAllResponseHeaders();
    const headerMap: Record<string, string | string[]> = {};
    for (const header of headers.split('\n')) {
        if (!header) continue;
        let [key, ...values] = header.trim().split(': ');
        key = key.trim();
        const value = values.join(': ').trim();
        if (headerMap[key]) {
            const oldValue = headerMap[key];
            if (Array.isArray(oldValue)) {
                oldValue.push(value);
            } else {
                headerMap[key] = [oldValue, value];
            }
        } else {
            headerMap[key] = value;
        }
    }
    return headerMap;
}

function getResponseContent(xhr: XMLHttpRequest) {
    if (!xhr.responseType || xhr.responseType === 'text') {
        return xhr.responseText;
    } else if (xhr.responseType === 'json') {
        if (typeof xhr.response === "object") {
            return xhr.response;
        } else {
            try {
                return JSON.parse(xhr.responseText);
            } catch (e) {
            }
        }
    }
    return xhr.response;
}
