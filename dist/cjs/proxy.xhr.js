var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/proxy.xhr.ts
var proxy_xhr_exports = {};
__export(proxy_xhr_exports, {
  default: () => proxyXHR
});
module.exports = __toCommonJS(proxy_xhr_exports);
var ProxyPropResponse = ["response", "responseText", "responseXML", "status", "statusText"];
var ProxyGetPropWhiteList = [
  "open",
  "send",
  "setRequestHeader",
  "getResponseHeader",
  "getAllResponseHeaders",
  "dispatchEvent",
  "addEventListener",
  "removeEventListener",
  "onreadystatechange",
  "onload",
  "onloadend"
];
var ProxySetPropBlackList = [
  "open",
  "send",
  "setRequestHeader",
  "getResponseHeader",
  "getAllResponseHeaders",
  "addEventListener",
  "removeEventListener"
];
var ProxyEventList = ["readystatechange", "load", "loadend"];
function proxyXHR(options, win) {
  const { XMLHttpRequest: OriginXMLHttpRequest } = win;
  class ProxyXMLHttpRequest extends OriginXMLHttpRequest {
    constructor() {
      super();
      this._ready = () => {
        this._response.status = this._originXhr.status;
        this._response.statusText = this._originXhr.statusText;
        this._response.response = getResponseContent(this._originXhr);
        this._response.responseText = this._originXhr.responseText;
        if (!this._originXhr.responseType || this._originXhr.responseType === "document") {
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
      };
      this._dispatch = (type) => {
        if (type === "readystatechange") {
          if (this._lastReadyState === this._originXhr.readyState) {
            return;
          }
          this._lastReadyState = this._originXhr.readyState;
        }
        const event_handler = this._eventListeners[type];
        const event_handler_name = `on${type}`;
        const event_on_handler = this[event_handler_name];
        if (event_on_handler || (event_handler == null ? void 0 : event_handler.length)) {
          const event = this._createEvent(type);
          event_on_handler == null ? void 0 : event_on_handler(event);
          event_handler == null ? void 0 : event_handler.forEach((item) => item(event));
        }
      };
      this.addEventListener = (type, listener, options2) => {
        if (ProxyEventList.includes(type)) {
          if (!(type in this._eventListeners)) {
            this._eventListeners[type] = [];
          }
          this._eventListeners[type].push(listener);
        } else {
          this._originXhr.addEventListener(type, listener, options2);
        }
      };
      this.removeEventListener = (type, listener, options2) => {
        if (ProxyEventList.includes(type)) {
          const index = this._eventListeners[type].indexOf(listener);
          if (index !== -1) {
            this._eventListeners[type].splice(index, 1);
          }
        } else {
          this._originXhr.removeEventListener(type, listener, options2);
        }
      };
      this.open = (method, url, async, username, password) => {
        this._requestConfig.method = method;
        this._requestConfig.url = url;
        this._requestConfig.async = async ?? true;
        this._requestConfig.username = username;
        this._requestConfig.password = password;
        if (options.onRequest && !this._requestConfig.async) {
          throw Error("[Not implemented]尚未实现");
        } else {
          this._originXhr.open(method, url, async ?? true, username, password);
        }
      };
      this.send = (body) => {
        this._requestConfig.body = body;
        this._requestConfig.withCredentials = this.withCredentials;
        if (options.onRequest) {
          throw Error("[Not implemented]尚未实现");
        } else {
          this._originXhr.send(body);
        }
      };
      this.setRequestHeader = (name, value) => {
        this._requestConfig.headers[name] = value;
        this._originXhr.setRequestHeader(name, value);
      };
      this.getResponseHeader = (name) => {
        var _a;
        const header = (_a = this._response) == null ? void 0 : _a.headers[name.toLowerCase()];
        if (header !== void 0) {
          if (Array.isArray(header)) {
            return header.join(",");
          }
          return header;
        }
        return null;
      };
      this.getAllResponseHeaders = () => {
        var _a;
        const headers = (_a = this._response) == null ? void 0 : _a.headers;
        const headerLines = [];
        for (const [key, value] of Object.entries(headers)) {
          if (Array.isArray(value)) {
            value.forEach((v) => headerLines.push(`${key}: ${v}`));
          } else {
            headerLines.push(`${key}: ${value}`);
          }
        }
        return headerLines.join("\r\n");
      };
      this._originXhr = new OriginXMLHttpRequest();
      this._eventListeners = {};
      this._lastReadyState = 0;
      this._requestConfig = {
        url: "",
        body: null,
        headers: {},
        method: "",
        withCredentials: this.withCredentials,
        type: "XMLHttpRequest",
        xhr: this._originXhr
      };
      this._response = {
        config: this._requestConfig,
        headers: {},
        response: null,
        responseText: "",
        responseXML: null,
        status: 0,
        statusText: ""
      };
      const ths = new Proxy(this, { set: this._set, get: this._get });
      this._originXhr.addEventListener("readystatechange", this._originReadyStateChange.bind(ths));
      return ths;
    }
    _get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      if (ProxyPropResponse.includes(prop)) {
        return target._response[prop];
      } else if (ProxyGetPropWhiteList.includes(prop) || prop.startsWith("_")) {
        const result2 = Reflect.get(target, prop);
        if (typeof result2 === "function" && !prop.startsWith("on")) {
          return result2.bind(target);
        }
        return result2;
      }
      const result = target._originXhr[prop];
      if (typeof result === "function" && !prop.startsWith("on") && OriginXMLHttpRequest.prototype.hasOwnProperty(prop)) {
        return result.bind(target._originXhr);
      }
      return result;
    }
    /**
     * 判断给定的属性是否需要被设置为原始值。
     *
     * @param prop - 属性名，可以是字符串或符号类型。
     *           - 如果是字符串类型，会进一步检查是否以 'on' 开头。
     *           - 如果是符号类型，则直接返回 true。
     * @returns {boolean}
     *           - 如果属性名是字符串且以 'on' 开头，则检查其事件名称是否不在 ProxyEventList 中，返回布尔值。
     *           - 如果属性名是符号类型，或者不以 'on' 开头，则返回 true。
     */
    _setToOrigin(prop) {
      if (typeof prop === "string") {
        if (prop.startsWith("on")) {
          const eventName = prop.slice(2);
          return !ProxyEventList.includes(eventName);
        } else if (ProxySetPropBlackList.includes(prop)) {
          return false;
        }
      }
      return true;
    }
    _set(target, prop, value) {
      if (typeof prop === "string" && ProxyPropResponse.includes(prop)) {
        target._response[prop] = value;
      }
      if (prop === "withCredentials") {
        target._requestConfig.withCredentials = value;
      }
      if (target._setToOrigin(prop)) {
        try {
          target._originXhr[prop] = value;
        } catch (e) {
        }
      }
      try {
        return Reflect.set(target, prop, value);
      } catch (e) {
        return false;
      }
    }
    _createEvent(type) {
      const newEvent = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(newEvent, "target", { value: this, writable: false });
      Object.defineProperty(newEvent, "currentTarget", { value: this, writable: false });
      Object.defineProperty(newEvent, "srcElement", { value: this, writable: false });
      return newEvent;
    }
    _createResponseHandler() {
      const ths = this;
      const result = {
        next(response) {
        },
        resolve(response) {
          ths._response = response;
          ths._dispatch("readystatechange");
          ths._dispatch("load");
          ths._dispatch("loadend");
        },
        reject(error) {
          throw Error("[Not implemented]尚未实现");
        }
      };
      result.next = result.resolve;
      return result;
    }
    _originReadyStateChange() {
      const readyState = this._originXhr.readyState;
      if (readyState === 4) {
        if (!this._ready()) {
          return;
        }
      }
      this._dispatch("readystatechange");
      if (readyState === 4) {
        this._dispatch("load");
        this._dispatch("loadend");
      }
    }
  }
  win.XMLHttpRequest = ProxyXMLHttpRequest;
}
function getResponseHeaders(xhr) {
  const headers = xhr.getAllResponseHeaders();
  const headerMap = {};
  for (const header of headers.split("\n")) {
    if (!header)
      continue;
    let [key, ...values] = header.trim().split(": ");
    key = key.trim();
    const value = values.join(": ").trim();
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
function getResponseContent(xhr) {
  if (!xhr.responseType || xhr.responseType === "text") {
    return xhr.responseText;
  } else if (xhr.responseType === "json") {
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
