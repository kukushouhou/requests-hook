import { ProxyOptions } from "./interfaces";
declare global {
    interface Window {
        XMLHttpRequest: typeof XMLHttpRequest;
    }
}
export default function proxyXHR(options: ProxyOptions, win: Window): void;
