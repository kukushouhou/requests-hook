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

// src/proxy.fetch.ts
var proxy_fetch_exports = {};
__export(proxy_fetch_exports, {
  default: () => proxyFetch
});
module.exports = __toCommonJS(proxy_fetch_exports);
function proxyFetch(options, win) {
  const { fetch: originFetch } = win;
  win.fetch = async function(input, init) {
    const config = initFetchRequestConfig(input, init);
    if (options.onRequest) {
      throw Error("[Not implemented]尚未实现");
    }
    let response = await originFetch.call(win, input, init);
    const requestResponse = await initFetchResponse(response, config);
    const originResponse = requestResponse.response;
    const originResponseText = requestResponse.responseText;
    const originResponseHeadersText = JSON.stringify(response.headers);
    if (options.onResponse) {
      response = await new Promise((resolve, reject) => {
        var _a;
        (_a = options.onResponse) == null ? void 0 : _a.call(options, requestResponse, {
          next: resolve,
          resolve,
          reject
        });
      }).then((newResponse) => {
        const changeValue = checkUserHasChangeResponse(newResponse, response, originResponse, originResponseText, originResponseHeadersText);
        if (changeValue) {
          return new Response(changeValue, {
            status: requestResponse.status,
            statusText: requestResponse.statusText,
            headers: formatHeadersToResponse(requestResponse.headers)
          });
        }
        if (newResponse.responseClone && !newResponse.responseClone.bodyUsed) {
          return newResponse.responseClone;
        }
        return response;
      });
    }
    return response;
  };
}
function initFetchRequestConfig(input, init) {
  let requestInit = new Request(input, init);
  const config = {
    type: "fetch",
    url: requestInit.url,
    method: requestInit.method,
    body: requestInit.body,
    headers: requestInit.headers,
    async: true,
    withCredentials: (init == null ? void 0 : init.credentials) === "include" || false,
    fetch: requestInit
  };
  return config;
}
async function initFetchResponse(response, config) {
  const responseText = await response.clone().text();
  return {
    config,
    headers: loadHeadersToRequestResponse(response.headers),
    response: loadContentToRequestResponse(response, responseText),
    responseText,
    responseClone: response.clone(),
    responseXML: null,
    status: response.status,
    statusText: response.statusText
  };
}
function loadContentToRequestResponse(response, responseText) {
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText);
    } catch (e) {
    }
  }
  return responseText;
}
function loadHeadersToRequestResponse(headers) {
  const headersObj = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return headersObj;
}
function formatHeadersToResponse(headers) {
  const headersObj = {};
  Object.keys(headers).forEach((key) => {
    headersObj[key] = headers[key].toString();
  });
  return headersObj;
}
function checkUserHasChangeResponse(newResponseObj, originResponseObj, originResponse, originResponseText, originResponseHeadersText) {
  if (newResponseObj.responseText !== originResponseText) {
    return newResponseObj.responseText;
  }
  if (newResponseObj.response !== originResponse || newResponseObj.status !== originResponseObj.status || newResponseObj.statusText !== originResponseObj.statusText || JSON.stringify(newResponseObj.headers) !== originResponseHeadersText) {
    if (typeof newResponseObj.response === "object") {
      return JSON.stringify(newResponseObj.response);
    } else {
      return newResponseObj.response;
    }
  }
  return null;
}
