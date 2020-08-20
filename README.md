# vertojs

Verto (VER-to) RTC is a FreeSWITCH endpoint that implements a subset of a JSON-RPC connection designed for use over secure websockets. The initial target is WebRTC to simplify coding and implementing calls from web browsers and devices to FreeSWITCH. This allows a web browser or other WebRTC client to originate a call using Verto into a FreeSWITCH installation and then out to the PSTN using SIP, SS7, or other supported protocol.

This is a zero-dependency implementation that is no need to include jquery as in an original one. It doesn't contain any html stuff inside or media handlers as well. You should
take care of fetch media tracks yourself (I think it is better not to hide useful features of you, browser provides a great API to handle media)

## Status

This is a work in progress code. However, it is stable enough to use basic functions (calls).
I believe and I hope the source code is much better than my English :-)


## Get started

Package directory content


**/dist** &mdash; contains a minified bundle exporting **Verto** symbol to a global namespace

**/src** &mdash; contains source Typescript files

To use this package you can either include *dist/verto.js* as a html &lt;script&gt; tag or import it using webpack like that

```typescript
import { Verto } from 'vertojs'
```

Check index.html in the package directory to find out how to use this code with a html &lt;script&gt; tag

## Create a client instance

```typescript
let verto = new Verto(options: VertoOptions)

```

```typescript
interface VertoOptions {
  transportConfig : JsonRpcClientParams 
  // Verto transport configuration, check below
  
  rtcConfig?      : RTCConfiguration    
    // RTCConfiguration object, as described here 
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  // The most important thing is iceServers item that should be set to go over NAT
  
  debug?          : boolean
  // Set true to get some useful debug info in browser console 
  
  ice_timeout?    : number
  // Milliseconds to stop waiting for ice candidates, default to 3000ms
}

interface JsonRpcClientParams {
  socketUrl       : string
  // The URL where the verto interface lives
  // wss://server.example.com:8082

  login           : string
  passwd          : string
}
```

### Receive calls

You should register to verto to receive calls.

The following code is a simplified example of using the handler function to auto answer the first incoming call and add first received audio track to some &lt;video&gt; element.
```typescript
try {
  let data = await verto.login()
} catch (error) {
  alert("Access denied")
  return
}

let local_stream = await navigator.mediaDevices.getUserMedia({audio:true})

verto.subscribeEvent('invite', call => {

  call.subscribeEvent('track', (track) => {
    if(track.kind!='audio') return
    
    let stream = new MediaStream()
    stream.addTrack(track)
    
    let el = document.getElementById('video')
    el.srcObject = stream
  })

  call.answer(local_stream.getTracks())
})

```

### Place calls


```typescript

let local_stream = await navigator.mediaDevices.getUserMedia({audio:true})

let call = verto.call(local_stream.getTracks(), "9664")

call.subscribeEvent('track', (track) => {
  if(track.kind!='audio') return
  
  let stream = new MediaStream()
  stream.addTrack(track)

  let el = document.getElementById('video')
  el.srcObject = stream
})

```

# API description

There's a number (pretty small number) of Classes and Interfaces provided.

## Verto

### Methods

**constructor**

```typescript
let verto = new Verto(options: VertoOptions)

```

```typescript
interface VertoOptions {
  transportConfig : JsonRpcClientParams 
  // Verto transport configuration, check below
  
  rtcConfig?      : RTCConfiguration    
    // RTCConfiguration object, as described here 
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  // The most important thing is iceServers item that should be set to go over NAT
  
  debug?          : boolean
  // Set true to get some useful debug info in browser console 
  
  ice_timeout?    : number
  // Milliseconds to stop waiting for ice candidates, default to 3000ms
}

interface JsonRpcClientParams {
  socketUrl       : string
  // The URL where the verto interface lives
  // wss://server.example.com:8082

  login           : string
  passwd          : string
}
```
**login**

***Parameters***

- None

***Returns***

- *Promise*, that will be resolved if the login process succeed or threw an exception otherwise.

```typescript
verto.login()
```

**call**

***Parameters***

- tracks: Array&lt;[MediaStreamTrack](https://developer.mozilla.org/ru/docs/Web/API/MediaStreamTrack)&gt;
  <br>represents tracks to be sent to the remote call side
- destination: string
  <br>an extension to be dialed
- options?: [VertoCallOptions](#VertoCallOptions)
  <br>call options

***Returns***

- [VertoCall](#VertoCall) instance

```typescript
let call = verto.call(tracks, destination, options)
```

**isLogged**

***Parameters***

- None

***Returns***

- Boolean

```typescript
let isLogged = verto.isLogged()
```

**logout**

***Parameters***

- None

***Returns***

- Void

```typescript
verto.logout()
```
### Events

#### invite

Fires on incoming call. As a parameter handler will receive a [VertoCall](#VertoCall) instance.

```typescript
verto.subscribeEvent('invite', call => {

  call.subscribeEvent('track', (track) => {
    if(track.kind!='audio') return
    
    let stream = new MediaStream()
    stream.addTrack(track)
    
    let el = document.getElementById('video')
    el.srcObject = stream
  })

  call.answer(local_stream.getTracks())
})
```

## VertoCall

This class instances should never be built manually, but using verto.call or incoming call handler.

### Methods

**answer**

***Parameters***

- tracks: Array&lt;[MediaStreamTrack](https://developer.mozilla.org/ru/docs/Web/API/MediaStreamTrack)&gt;
  <br>represents tracks to be sent to the remote call side

***Returns***

- None

```typescript
call.answer(tracks)
```
**hangup**

***Parameters***

- None

***Returns***

- None

```typescript
call.hangup()
```

**dtmf**

***Parameters***

- String

***Returns***

- None

```typescript
call.dtmf('5')
```

**hold**

***Parameters***

- None

***Returns***

- None

```typescript
call.hold()
```

**unhold**

***Parameters***

- None

***Returns***

- None

```typescript
call.unhold()
```

**toggleHold**

***Parameters***

- None

***Returns***

- None

```typescript
call.toggleHold()
```

### Instance variables

**id**

- *String* &mdash; the call id

**options**

- *[VertoCallOptions](#VertoCallOptions)*

**direction**
- *[CallDirection](#CallDirection)*


### Events

#### answer

Fires when the call is answered.

```typescript
call.subscribeEvent('answer', () => {
    // Do something on answer
})
```

#### track

Fires when a MediaStreamTrack is received

```typescript
verto.subscribeEvent('invite', call => {

  call.subscribeEvent('track', (track) => {
    if(track.kind!='audio') return
    
    let stream = new MediaStream()
    stream.addTrack(track)
    
    let el = document.getElementById('video')
    el.srcObject = stream
  })

  call.answer(local_stream.getTracks())
})
```

#### bye

Fires when the call is ended.

```typescript
call.subscribeEvent('bye', cause => {
    // Do something on call end
})
```

## Interfaces

#### VertoCallOptions

```typescript
interface VertoCallOptions {
  caller_id_number?   : string
  caller_id_name?     : string
  callee_id_number?   : string
  callee_id_name?     : string
}
```

#### VertoOptions
```typescript
interface VertoOptions {
  transportConfig : JsonRpcClientParams 
  // Verto transport configuration, check below
  
  rtcConfig?      : RTCConfiguration    
    // RTCConfiguration object, as described here 
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  // The most important thing is iceServers item that should be set to go over NAT
  
  debug?          : boolean
  // Set true to get some useful debug info in browser console 
  
  ice_timeout?    : number
  // Milliseconds to stop waiting for ice candidates, default to 3000ms
}
```

#### JsonRpcClientParams
```typescript
interface JsonRpcClientParams {
  socketUrl       : string
  // The URL where the verto interface lives
  // wss://server.example.com:8082

  login           : string
  passwd          : string
}
```

#### CallDirection
```typescript
enum CallDirection {
  Incoming,
  Outgoing
}
```

## Event handling

Both [Verto](#Verto) and [VertoCall](#VertoCall) classes uses the same event handling system.

**subscribeEvent**

***Parameters***

- name     : string
- handler  : {(data:any):void}

***Returns***

- *String* identifies the handler

```typescript
let handler_id = verto.subscribeEvent(name, handler)
```

**unsubscribeEvent**

***Parameters***

- name     : string
- handler_id? : string
  <br> if ommited, all the handlers for *name* event will be deleted

***Returns***

- None

```typescript
verto.unsubscribeEvent(name, handler_id)
```

## License

Copyright (c) 2019 Roman Yerin &lt;r.yerin@640kb.co.uk&gt;

Licensed under the 3-clause BSD license.

