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
	transportConfig	: JsonRpcClientParams
	rtcConfig?		: RTCConfiguration
	debug?			: boolean
	ice_timeout?	: number
}

interface VertoCallOptions {
	caller_id_number?	: string
	caller_id_name?		: string
	callee_id_number?	: string
	callee_id_name?		: string
}

class VertoCall extends VertoBase{

	private rtc: VertoRtc
	private rpc: JsonRpcClient
	public id: string
	public options: VertoCallOptions
	public direction: CallDirection

	constructor(conf: RTCConfiguration, rpc: JsonRpcClient, dest?: string, id?:string, options?: VertoCallOptions, ice_timeout?: number, debug?: boolean){
		super(debug)
		this.id = id || generateGUID()
		this.options = options || <VertoCallOptions>{}
		this.direction = dest?CallDirection.Outgoing:CallDirection.Incoming
		this.rtc = new VertoRtc(conf, this.direction, ice_timeout, debug)
		this.rpc = rpc

		this.rtc.subscribeEvent('send-offer', sessionDescription => {
			this.rpc.call('verto.invite', { dialogParams: {destination_number: dest, callID: this.id}, sdp: sessionDescription.sdp}, data => {}, data => {})
		})

		this.rtc.subscribeEvent('send-answer', sessionDescription => {
			this.rpc.call('verto.answer', { dialogParams: {destination_number: dest, callID: this.id}, sdp: sessionDescription.sdp}, data => {}, data => {})
		})

		this.rtc.subscribeEvent('track', track => {
			this.dispatchEvent('track', track)
		})

	}

	onAnswer(sdp: string) {
		this.rtc.onAnswer(sdp)
		this.dispatchEvent('answer')
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

	hangup() {
		this.rpc.call('verto.bye', { dialogParams: {callID: this.id}}, data => {}, data => {})
		this.clear()
	}

	clear() {
		this.dispatchEvent('bye', this)
	}
}

class Verto extends VertoBase{

	private calls		: {[key:string]: VertoCall} = {}
	private rpc			: JsonRpcClient
	private options		: VertoOptions
	private sessid		: string
	private logged_in	: boolean = false
	
	constructor(options: VertoOptions) {
		// 
		super(options.debug)
		this.options = options
		this.rpc = new JsonRpcClient(options.transportConfig, options.debug)
		this.rpc.setEventHandler((method, params) => {
			switch(method) {
				case 'verto.answer': {
					let callID: string = params.callID
					this.calls[callID].onAnswer(params.sdp)
					break
				}
				case 'verto.invite': {
					let call = new VertoCall(this.options.rtcConfig,this.rpc,'',params.callID, {caller_id_name: params.caller_id_name, caller_id_number: params.caller_id_number}, this.options.ice_timeout, this.options.debug)
					call.preSdp(params.sdp)
					this.calls[params.callID] = call
					this.dispatchEvent('invite',call)
					break
				}
				case 'verto.bye': {
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

	login(){
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
		let call = new VertoCall(this.options.rtcConfig, this.rpc, destination, generateGUID(), {}, this.options.ice_timeout, this.options.debug)

		for(let track of tracks) call.addTrack(track)
		this.calls[call.id] = call
		return call
	}

}

export { Verto, CallDirection }
