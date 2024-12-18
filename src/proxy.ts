import {ProxyOptions} from "./interfaces";
import proxyXHR from "./proxy.xhr";


export default function proxy(options: ProxyOptions, win?: Window) {
    if (options.proxyXHR ?? true) {
        proxyXHR(options, win ?? window);
    }
}

