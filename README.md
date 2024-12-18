# request-hook


## 简介


## 使用

### 安装

- NPM引入

  ```shell
  npm install request-hook
  ```

一个简单示例：

```javascript
import { proxy } from "request-hook";
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

