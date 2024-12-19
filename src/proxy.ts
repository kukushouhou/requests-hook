import {ProxyOptions} from "./interfaces";
import proxyXHR from "./proxy.xhr";
import proxyFetch from "./proxy.fetch";


export default function proxy(options: ProxyOptions, win?: Window) {
    if (options.proxyXHR ?? true) {
        proxyXHR(options, win ?? window);
    }
    if (options.proxyFetch ?? true) {
        proxyFetch(options, win ?? window);
    }
}

