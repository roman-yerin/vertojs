"use strict";
/*

Verto FreeSWITCH interface

(c) Roman Yerin <r.yerin@640kb.co.uk>, 2019

Licence MIT

*/
exports.__esModule = true;
var json_rpc_1 = require("./json-rpc");
var Verto = /** @class */ (function () {
    function Verto(options) {
        this.dialogs = [];
        // 
        this.rpc = new json_rpc_1.JsonRpcClient(options.transportConfig);
    }
    Verto.prototype.login = function () {
        this.rpc.call('login', {}, function (data) {
            console.log('login success', data);
        }, function (data) {
            console.log('login failed', data);
        });
    };
    return Verto;
}());
exports.Verto = Verto;
