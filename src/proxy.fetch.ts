import {ProxyOptions, RequestConfig, RequestResponse} from "./interfaces";

export default function proxyFetch(options: ProxyOptions, win: Window) {
    const {fetch: originFetch} = win;
    win.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        // console.log("start hook fetch");
        const config = initFetchRequestConfig(input, init);

        if (options.onRequest) {
            // TODO 拦截send，进行请求拦截
            throw Error('[Not implemented]尚未实现');
        }
        let response = await originFetch.call(win, input, init);
        const requestResponse = await initFetchResponse(response, config);
        const originResponse = requestResponse.response;
        const originResponseText = requestResponse.responseText;
        const originResponseHeadersText = JSON.stringify(response.headers);
        if (options.onResponse) {
            response = await new Promise<RequestResponse>((resolve, reject) => {
                options.onResponse?.(requestResponse, {
                    next: resolve,
                    resolve,
                    reject,
                })
            }).then(newResponse => {
                // 检测用户是否修改了response，如果修改了，则构建新的response返回
                const changeValue = checkUserHasChangeResponse(newResponse, response, originResponse, originResponseText, originResponseHeadersText);
                if (changeValue) {
                    return new Response(changeValue, {
                        status: requestResponse.status,
                        statusText: requestResponse.statusText,
                        headers: formatHeadersToResponse(requestResponse.headers),
                    });
                }
                // 如果用户没直接改变响应的文本或响应内容，则判断传递给用户的responseClone是否还是未使用的，如果是未使用的则直接返回该response
                if (newResponse.responseClone && !newResponse.responseClone.bodyUsed) {
                    return newResponse.responseClone;
                }
                return response;
            });
        }
        return response;
    }
}

function initFetchRequestConfig(input: RequestInfo | URL, init?: RequestInit): RequestConfig {
    let requestInit: Request = new Request(input, init);

    const config: RequestConfig = {
        type: 'fetch',
        url: requestInit.url,
        method: requestInit.method,
        body: requestInit.body,
        headers: requestInit.headers,
        async: true,
        withCredentials: init?.credentials === 'include' || false,
        fetch: requestInit
    }
    return config;
}

async function initFetchResponse(response: Response, config: RequestConfig): Promise<RequestResponse> {
    const responseText = await response.clone().text();

    return {
        config,
        headers: loadHeadersToRequestResponse(response.headers),
        response: loadContentToRequestResponse(response, responseText),
        responseText: responseText,
        responseClone: response.clone(),
        responseXML: null,
        status: response.status,
        statusText: response.statusText
    }
}

function loadContentToRequestResponse(response: Response, responseText: string) {
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
        try {
            return JSON.parse(responseText);
        } catch (e) {
        }
    }
    return responseText;
}

function loadHeadersToRequestResponse(headers: Headers) {
    const headersObj: Record<string, string | string[]> = {};
    headers.forEach((value, key) => {
        headersObj[key] = value;
    });
    return headersObj;
}

function formatHeadersToResponse(headers: Record<string, string | string[]>) {
    const headersObj: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        headersObj[key] = Array.isArray(value) ? value.join(',') : value;
    }
    return headersObj;
}

/**
 * 检查用户是否更改了响应文本
 * 该函数用于比较新的响应对象与原始响应对象的差异，以确定响应文本是否已被修改
 *
 * @param newResponseObj - 新的响应对象，包含响应文本、状态等信息
 * @param originResponseObj - 原始的响应对象，用于与新响应对象进行比较
 * @param originResponse - 原始的响应内容，用于比较是否发生变化
 * @param originResponseText - 原始的响应文本，用于与新响应对象的响应文本进行比较
 * @param originResponseHeadersText - 原始的响应头文本，用于与新响应对象的响应头进行比较
 * @returns 如果响应文本或响应内容有变化，返回变化后的响应文本或响应内容；如果没有变化，返回null
 */
function checkUserHasChangeResponse(newResponseObj: RequestResponse, originResponseObj: Response, originResponse: any, originResponseText: string, originResponseHeadersText: string): any | null {
    // 检查响应文本是否发生变化
    if (newResponseObj.responseText !== originResponseText) {
        return newResponseObj.responseText;
    }
    // 检查响应内容、状态、状态文本或响应头是否发生变化
    if (newResponseObj.response !== originResponse || newResponseObj.status !== originResponseObj.status || newResponseObj.statusText !== originResponseObj.statusText || JSON.stringify(newResponseObj.headers) !== originResponseHeadersText) {
        if (typeof newResponseObj.response === 'object') {
            return JSON.stringify(newResponseObj.response);
        } else {
            return newResponseObj.response;
        }
    }
    // 如果没有发生变化，返回null
    return null;
}


