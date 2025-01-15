import {ProxyOptions} from "./interfaces";
import proxyFetch from "./proxy.fetch";
import proxyXHR from "./proxy.xhr";


export default function proxy(options: ProxyOptions, win?: Window) {
    if (options.proxyXHR ?? true) {
        proxyXHR(options, win ?? window);
    }
    if (options.proxyFetch ?? true) {
        proxyFetch(options, win ?? window);
    }
}

