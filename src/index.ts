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

import { JsonRpcClient, JsonRpcClientParams } from './json-rpc'
import { VertoRtc, CallDirection } from './rtc'
import { VertoBase, generateGUID } from './base'

interface VertoOptions {
  transportConfig  : JsonRpcClientParams
  rtcConfig?       : RTCConfiguration
  debug?           : boolean
  ice_timeout?     : number
}

interface VertoCallOptions {
  caller_id_number? : string
  caller_id_name?   : string
  callee_id_number? : string
  callee_id_name?   : string
}

const VertoMessage = { 
  Invite:       'verto.invite',
  Answer:       'verto.answer',
  Bye:          'verto.bye',
  Media:        'verto.media',
  Attach:       'verto.attach',
  Modify:       'verto.modify',
  Subscribe:    'verto.subscribe',
  Unsubscribe:  'verto.unsubscribe',
  Info:         'verto.info',
  Display:      'verto.display',
  ClientReady:  'verto.clientReady',
  Broadcast:    'verto.broadcast'
}

class VertoCall extends VertoBase{

  private rtc: VertoRtc
  private rpc: JsonRpcClient
  public id: string
  public options: VertoCallOptions
  public direction: CallDirection
  public holdStatus: boolean

  constructor(conf: RTCConfiguration, rpc: JsonRpcClient, dest?: string, id?:string, options?: VertoCallOptions, ice_timeout?: number, debug?: boolean){
    super(debug)
    this.id = id || generateGUID()
    this.options = options || <VertoCallOptions>{}
    this.direction = dest?CallDirection.Outgoing:CallDirection.Incoming
    this.rtc = new VertoRtc(conf, this.direction, ice_timeout, debug)
    this.rpc = rpc

    this.rtc.subscribeEvent('send-offer', sessionDescription => {
      let dialogParams = Object.assign({}, this.options)
      dialogParams = Object.assign(dialogParams, {destination_number: dest, callID: this.id})
      
      this.rpc.call(VertoMessage.Invite, { dialogParams, sdp: sessionDescription.sdp}, data => {}, data => {})
    })

    this.rtc.subscribeEvent('send-answer', sessionDescription => {
      this.rpc.call(VertoMessage.Answer, { dialogParams: {destination_number: dest, callID: this.id}, sdp: sessionDescription.sdp}, data => {}, data => {})
    })

    this.rtc.subscribeEvent('track', track => {
      this.dispatchEvent('track', track)
    })

  }

  onAnswer(sdp: string) {
    if (sdp) {
            this.rtc.onMedia(sdp)
    }
        if(this.debug) console.log('answer')
    this.dispatchEvent('answer')
  }

  onMedia(sdp: string) {
    this.rtc.onMedia(sdp)
    this.dispatchEvent('media')
  }

  addTrack(track: MediaStreamTrack){
    this.rtc.addTrack(track)
  }

  preSdp(sdp: string) {
    this.rtc.preSdp(sdp)
  }

  answer(tracks: Array<MediaStreamTrack>) {
    this.rtc.answer(tracks)
  }

  hangup(params = {}) {
    this.rpc.call(VertoMessage.Bye, { dialogParams: {callID: this.id}, ...params}, data => {}, data => {})
    this.clear()
  }

  clear() {
    this.dispatchEvent('bye', this)
  }

  dtmf(input: string) {
        this.rpc.call(VertoMessage.Info, { dtmf: input.toString(), dialogParams: {callID: this.id}}, data => {}, data => {})
  }

    hold(params?: object) {
    this.rpc.call(VertoMessage.Modify, {action: "hold", dialogParams: {callID: this.id, ...this.options, ...params}},(data: {holdState:string}) => {
      if (data.holdState === 'held') {
        this.holdStatus = true
                this.dispatchEvent('hold', this)
      } else {
                this.holdStatus = false
                this.dispatchEvent('unhold', this)
      }
    }, data => {})
  }

    unhold(params?: object) {
        this.rpc.call(VertoMessage.Modify, {action: "unhold", dialogParams: {callID: this.id, ...this.options, ...params}},(data: {holdState:string}) => {
            if (data.holdState === 'held') {
                this.holdStatus = true
                this.dispatchEvent('hold', this)
            } else {
                this.holdStatus = false
                this.dispatchEvent('unhold', this)
            }
        }, data => {})
  }

    toggleHold(params?: object) {
        this.rpc.call(VertoMessage.Modify, {action: "toggleHold", dialogParams: {callID: this.id, ...this.options, ...params}},(data: {holdState:string}) => {
            if (data.holdState === 'held') {
                this.holdStatus = true
                this.dispatchEvent('hold', this)
            } else {
                this.holdStatus = false
                this.dispatchEvent('unhold', this)
            }
        }, data => {})
  }

}

class Verto extends VertoBase{

  private calls     : {[key:string]: VertoCall} = {}
  private rpc       : JsonRpcClient
  private options   : VertoOptions
  private sessid    : string
  private logged_in : boolean = false
  
  constructor(options: VertoOptions) {
    // 
    super(options.debug)
    this.options = options
    this.rpc = new JsonRpcClient(options.transportConfig, options.debug)
    this.rpc.setEventHandler((method, params) => {
      switch(method) {
        case VertoMessage.Answer: {
          let callID: string = params.callID
          this.calls[callID].onAnswer(params.sdp)
          break
        }
        case VertoMessage.Media: {
          let callID: string = params.callID
          this.calls[callID].onMedia(params.sdp)
          break
        }
        case VertoMessage.Invite: {
          let call = new VertoCall(this.options.rtcConfig,this.rpc,'',params.callID, {caller_id_name: params.caller_id_name, caller_id_number: params.caller_id_number}, this.options.ice_timeout, this.options.debug)
          call.preSdp(params.sdp)
          this.calls[params.callID] = call
          this.dispatchEvent('invite',call)
          break
        }
        case VertoMessage.Bye: {
          let call = this.calls[params.callID]
          call.clear()
          delete this.calls[params.callID]
          break
        }
      }
    })
    this.rpc.setReconnectHandler(() => {
      if(this.logged_in) this.login()
    })
    this.options.rtcConfig = Object.assign(
      {}, this.options.rtcConfig || {})

  }

  login(): Promise<any>{
    return new Promise((resolve, reject) => {
      this.rpc.call('login', {login: this.options.transportConfig.login, passwd: this.options.transportConfig.passwd}, (data: {sessid:string}) => {
        this.sessid = data.sessid
        this.logged_in = true
        resolve(data)
      }, (data: Object) => {
        reject(data)
      })
    })
  }

  call(tracks: Array<MediaStreamTrack>, destination: string, options?:VertoCallOptions): VertoCall {
    let call = new VertoCall(this.options.rtcConfig, this.rpc, destination, generateGUID(), options, this.options.ice_timeout, this.options.debug)

    for(let track of tracks) call.addTrack(track)
    this.calls[call.id] = call
    return call
  }

  isLogged(): boolean {
    return this.logged_in
  }

  logout(){
      if (this.calls) {
          Object.keys(this.calls).forEach(
              key => {
                  this.calls[key].hangup()
              }
          )
      }
      this.rpc.close()
      this.rpc = null
      this.sessid = null
      this.logged_in = false
  }

}

export { Verto, CallDirection }
