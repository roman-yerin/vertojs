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

const generateGUID = (typeof(window.crypto) !== 'undefined' && typeof(window.crypto.getRandomValues) !== 'undefined') ?
function(): string {
  let buf = new Uint16Array(8)
  window.crypto.getRandomValues(buf)
    let S4 = function(num:number) {
    let ret = num.toString(16)
    while (ret.length < 4) {
      ret = "0" + ret
    }
    return ret
  }
  return (S4(buf[0]) + S4(buf[1]) + "-" + S4(buf[2]) + "-" + S4(buf[3]) + "-" + S4(buf[4]) + "-" + S4(buf[5]) + S4(buf[6]) + S4(buf[7]))
}

:

function(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0,
    v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}


interface VertoEventHandler {
  code: {(data: any):void},
  id: string
}

class VertoBase {

  private event_handlers: {[name: string]: Array<VertoEventHandler>} = {}
  public debug: boolean

  constructor(debug?: boolean){
    this.debug = debug
  }

  subscribeEvent(name: string, handler: {(data:any):void}):string{
    let id = generateGUID()
    if(!this.event_handlers[name]) this.event_handlers[name] = []
    this.event_handlers[name].push({id, code: handler})
    return id 
  }

  unsubscribeEvent(name: string, handlerID?: string){
    if(handlerID) {
      this.event_handlers[name] = this.event_handlers[name].map((v, i, a) => { if(v.id == handlerID) return; else return v; })
    } else {
      this.event_handlers[name] = []
    }
  }

  dispatchEvent(name: string, data?: any){
    if(this.debug) console.log('Dispatch', name, data)
    if(this.event_handlers[name])
    for(let h of this.event_handlers[name]){
      h.code(data)
    }
  }

}

export { VertoBase, generateGUID }
