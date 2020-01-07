import { Verto } from '.'

let verto = new Verto({transportConfig:{
	login: '****',
	passwd: '****',
	socketUrl: 'wss://****:8082'
},rtcConfig:{}})


async function main(){
	try {
		let data = await verto.login()

		let stream = await navigator.mediaDevices.getUserMedia({audio:true})

		verto.subscribeEvent('invite', call => {

			call.subscribeEvent('track', (track:any) => {
				if(track.kind!='audio') return
				let stream = new MediaStream()
				stream.addTrack(track)
				let el:HTMLMediaElement = <HTMLMediaElement>document.getElementById('video')
				el.srcObject = stream
				console.log('track received', track)
			})

			call.answer(stream.getTracks())

		})
//		let call = verto.call(stream.getTracks(),'9664',{})
	} catch (error) {
		console.log(error)
	}
}

main()