/*

Verto FreeSWITCH interface

Copyright (c) 2019 Roman Yerin <r.yerin@640kb.co.uk>

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

/*

Interface to JSON RPC Client constructor

*/

interface JsonRpcClientParams {
  socketUrl   : string
  ajaxUrl?    : string
  onmessage?    : {(event:Object):void}
  login     : string
  passwd      : string
  sessid?     : string
  loginParams?  : Object
  userVariables?  : Object
}

/*

Interface to JSON RPC requests

*/

interface JsonRpcRequest {
  id    : number
  jsonrpc : string
  method  : string
  params  : Object
}

/*

Interface to JSON RPC replies

*/

interface JsonRpcReply {
  id      : number
  jsonrpc   : string
  method?   : string
  params?   : JsonRpcParams
  result?   : any
  error?    : {code?:number}
}

/*

Interface to JSON RPC calls

*/

interface JsonRpcCall {
  request: JsonRpcRequest 
  success_cb?: {(data: Object): void} 
  error_cb?: {(data: Object): void}
}

interface JsonRpcParams {
  callID        : string
  sdp?        : string
  caller_id_number  : string
  caller_id_name    : string
  callee_id_number  : string
  callee_id_name    : string

}

/*

JSON RPC Client

*/

class JsonRpcClient {
  
  options: JsonRpcClientParams
  private request_id: number = 1
  private socket_: WebSocket
  private queue: Array<string> = []
  private callbacks: Array<JsonRpcCall> = []
  private eventHandler: {(method:string, params:JsonRpcParams):void}
  private reconnectHandler: {():void}
  private debug: boolean = false

  private initSocket_(){
    this.socket_ = new WebSocket(this.options.socketUrl)
    this.socket_.onmessage = this.onMessage.bind(this)
    // TODO: Implement auto reconnect attepts
    this.socket_.onclose = () => {
      setTimeout(() => {
        if(this.debug) console.log("WSS reconnect")
        this.initSocket_()
      }, 1000)
    }
    this.socket_.onopen = () => {
      let req: string = ""
      if(this.reconnectHandler) this.reconnectHandler()

      while(req = this.queue.pop()){
        this.socket.send(req)
      }
    }
  }

    private closeSocket_(){
        this.socket_.onclose = () => {
            console.log("WebSocket is closed now.");
        }
        this.socket_.close()
    }

  private get socket(): WebSocket {

    if(this.socket_) {
      return this.socket_
    }
    this.initSocket_()
    return this.socket_

  }

  constructor(options: JsonRpcClientParams, debug?: boolean) {
    this.debug = debug
    this.options = Object.assign({
    }, options)
  }

  private onMessage(msg:MessageEvent){
    // Check if this is JSON RPC

    let response: JsonRpcReply
    try{
      response = JSON.parse(msg.data)
    } catch(error) {
      // Got something else, just ignore in case
    }

    if(this.debug) console.log(response)

    if(typeof response === 'object'
      && 'jsonrpc' in response
      && response['jsonrpc'] === '2.0'
      ) {
      if ('method' in response){
        this.eventHandler(response.method, response.params)
      }
      else if ('result' in response && this.callbacks[response.id]) {
        // We've just got response
        let success_cb = this.callbacks[response.id].success_cb
        delete this.callbacks[response['id']]
        success_cb(Object.assign({}, response.result))
      } else if('error' in response && this.callbacks[response.id]) {
        let error_cb = this.callbacks[response.id].error_cb
        let failed_request = Object.assign({}, this.callbacks[response.id])

        delete this.callbacks[response['id']]

        if(response.error.code == -32000 && this.options.login && this.options.passwd) {
          // Auth is needed
          this.call('login', {
              login: this.options.login,
              passwd: this.options.passwd,
              loginParams: this.options.loginParams,
              userVariables: this.options.userVariables
            },
            (data) => {
              // Re-send failed request
              this.socketCall_(failed_request)
            }, 
            (data) => {
              // Auth failed
              error_cb(Object.assign({}, response.result))
            })
        } else {
          error_cb(Object.assign({}, response.result))
        }
      }
    }
  }

  private socketCall_({request, success_cb, error_cb}: JsonRpcCall) {
        request.id = this.request_id++

    let rawData = JSON.stringify(request)

    this.callbacks[request.id] = { request, success_cb, error_cb }

    if(this.socket.readyState < 1) {
      // Socket is not ready, queue message
      this.queue.push(rawData)
      if(this.debug) console.log('Queued', rawData)
    } else {
      this.socket.send(rawData)
      if(this.debug) console.log('Sent', rawData)
    }
  }

  public setEventHandler(handler: {(method: string, params: JsonRpcParams):void}){
    this.eventHandler = handler
  }

  public setReconnectHandler(handler: {():void}){
    this.reconnectHandler = handler
  }

  public call(method: string, params?: Object, success_cb?: {(data: Object): void}, error_cb?: {(data: Object): void}) {
    // Construct the JSON-RPC 2.0 request.
    let call_params = Object.assign({}, params)

    let request = {
      jsonrpc : '2.0',
            method  : method,
            params  : call_params,
            id    : 0
    }

    if(this.socket) {
      this.socketCall_({request, success_cb, error_cb})
    }
  }

    public close() {
        this.queue = []
        this.callbacks = []
        this.eventHandler = null
        this.reconnectHandler = null
        this.closeSocket_()
    }
}

export { JsonRpcClient, JsonRpcClientParams }

