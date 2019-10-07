"use strict";
/*

Interface to JSON RPC Client constructor

*/
exports.__esModule = true;
/*

JSON RPC Client

*/
var JsonRpcClient = /** @class */ (function () {
    function JsonRpcClient(options) {
        this.request_id = 1;
        this.queue = [];
        this.callbacks = [];
        this.options = Object.assign({}, options);
    }
    Object.defineProperty(JsonRpcClient.prototype, "socket", {
        get: function () {
            if (this.socket_) {
                return this.socket_;
            }
            this.socket_ = new WebSocket(this.options.socketUrl);
            this.socket_.onmessage = this.onMessage;
            // TODO: Implement auto reconnect attepts
            this.socket_.onclose = function () { };
            this.socket_.onopen = function () { };
            return this.socket_;
        },
        enumerable: true,
        configurable: true
    });
    JsonRpcClient.prototype.onMessage = function (msg) {
        // Check if this is JSON RPC
        var _this = this;
        var response;
        try {
            response = JSON.parse(msg.data);
        }
        catch (error) {
            // Got something else, just ignore in case
        }
        if (typeof response === 'object'
            && 'jsonrpc' in response
            && response['jsonrpc'] === '2.0') {
            if ('result' in response && this.callbacks[response.id]) {
                // We've just got response
                var success_cb = this.callbacks[response.id].success_cb;
                delete this.callbacks[response['id']];
                success_cb(Object.assign({}, response.result));
            }
            else if ('error' in response && this.callbacks[response.id]) {
                var error_cb_1 = this.callbacks[response.id].error_cb;
                var failed_request_1 = Object.assign({}, this.callbacks[response.id]);
                delete this.callbacks[response['id']];
                if (response.error.code == -32000 && this.options.login && this.options.passwd) {
                    // Auth is needed
                    this.call('login', { login: this.options.login, passwd: this.options.passwd, loginParams: this.options.loginParams, userVariables: this.options.userVariables }, function (data) {
                        // Re-send failed request
                        _this.socketCall_(failed_request_1);
                    }, function (data) {
                        // Auth failed
                        error_cb_1(Object.assign({}, response.result));
                    });
                }
                else {
                    error_cb_1(Object.assign({}, response.result));
                }
            }
        }
    };
    JsonRpcClient.prototype.socketCall_ = function (_a) {
        var request = _a.request, success_cb = _a.success_cb, error_cb = _a.error_cb;
        request.id = this.request_id++;
        var rawData = JSON.stringify(request);
        if (this.socket.readyState < 1) {
            // Socket is not ready, queue message
            this.queue.push(rawData);
        }
        else {
            this.socket.send(rawData);
        }
        if ('id' in request && typeof success_cb !== 'undefined') {
            this.callbacks[request['id']] = { request: request, success_cb: success_cb, error_cb: error_cb };
        }
    };
    JsonRpcClient.prototype.call = function (method, params, success_cb, error_cb) {
        // Construct the JSON-RPC 2.0 request.
        var call_params = Object.assign({}, params);
        var request = {
            jsonrpc: '2.0',
            method: method,
            params: call_params,
            id: 0
        };
        if (this.socket) {
            this.socketCall_({ request: request, success_cb: success_cb, error_cb: error_cb });
        }
    };
    return JsonRpcClient;
}());
exports.JsonRpcClient = JsonRpcClient;
