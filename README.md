# requests-hook

## 简介

【注意】当前该模块尚未开发完毕，当前版本仅实现了 `proxy` 模式中 `XMLHttpRequest` 的 `onResponse` 处理。

### API 参考

本模块的 API 设计参考了 [ajax-hook](https://github.com/wendux/ajax-hook)。

### 开发背景

由于 `ajax-hook` 底层是基于 `Object.defineProperty` 实现的，这在与其他同类模块共用时容易导致兼容性问题。为了克服这一问题，我们开发了本模块。

### 技术优势

通过使用 `Proxy` 代理，本模块放弃了对低版本浏览器的支持，从而提供了更好的与其他模块的兼容性。`Object.defineProperty` 默认情况下只能被定义一次，如果页面或用户的浏览器插件中存在类似的 hook，则可能会导致出错或因覆盖而失效。而使用 `Proxy` 则避免了这些问题。

【尚未开发】同时本模块扩展了对 `fetch` 、`sendBeacon`的支持，使其可以拦截所有网络请求，而不仅仅是 `XMLHttpRequest`。

## 使用

### 安装

- NPM引入

  ```shell
  npm install requests-hook
  ```

一个简单示例：

```javascript
import {proxy} from "requests-hook";

proxy({
    //请求发起前进入
    onRequest: (config, handler) => {
        console.log(config.url)
        handler.next(config);
    },
    //请求发生错误时进入，比如超时；注意，不包括http状态码错误，如404仍然会认为请求成功
    onError: (err, handler) => {
        console.log(err.type)
        handler.next(err)
    },
    //请求成功后进入
    onResponse: (response, handler) => {
        console.log(response.response)
        handler.next(response)
    }
})
```

现在，我们便拦截了浏览器中通过`XMLHttpRequest`发起的所有网络请求！在请求发起前，会先进入`onRequest`钩子，调用`handler.next(config)` 请求继续，如果请求成功，则会进入`onResponse`钩子，如果请求发生错误，则会进入`onError` 。我们可以更改回调钩子的第一个参数来修改修改数据。

