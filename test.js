let fs = require('fs')

let mf = require('./dist/MapFile').MapFile

let res = new mf()
let buf = fs.readFileSync('./ккр_~2.MAP')

res.Open(buf.buffer)
console.log('new ): ', fs.readFileSync('./ккр_~2.MAP').buffer);

console.log('res: ', res.objects);