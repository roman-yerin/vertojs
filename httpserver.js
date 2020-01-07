const http = require('https')
const fs = require('fs')
const url = require('url')
const path = require('path')
const mime = require('mime')

var options = {
  key: fs.readFileSync('privateKey.key'),
  cert: fs.readFileSync('certificate.crt')
}

var server = http.createServer(options, function(request, response) {
    var pathname = url.parse(request.url).pathname
    var filename = path.join(process.cwd(), '', pathname)
    if (!path.extname(filename)) {
      filename = filename + '/index.html';
    }
    if (fs.existsSync(filename)) {
      response.writeHead(200, {'Content-Type': mime.getType(filename)})
      fs.createReadStream(filename, {
        'flags': 'r',
        'encoding': 'binary',
        'mode': 0o666,
        'bufferSize': 4 * 1024
      }).addListener( "data", function(chunk) {
        response.write(chunk, 'binary')
      }).addListener( "close",function() {
        response.end()
      })
    } else {
      response.writeHead(404, {'Content-Type': 'text/html'})
      response.end()
    }
})

server.listen(443)
