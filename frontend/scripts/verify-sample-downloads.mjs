import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const items=JSON.parse(await readFile('src/features/samples/materials.json','utf8'));
const base='http://frontend:3000';
const digest=data=>createHash('sha256').update(data).digest('hex');
for(const item of items){
 const response=await fetch(`${base}/samples/${item.file}`);assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),item.format==='PNG'?/^image\/png/:/^image\/jpeg/);
 const data=Buffer.from(await response.arrayBuffer());assert.equal(data.length,item.bytes);assert.equal(digest(data),item.sha256);
}
for(const file of ['manual-verification.zip','SOURCES.md']){
 const response=await fetch(`${base}/samples/${file}`);assert.equal(response.status,200);
 const data=Buffer.from(await response.arrayBuffer());assert.equal(digest(data),digest(await readFile(`public/samples/${file}`)));
 if(file.endsWith('.zip'))assert.equal(data.readUInt32LE(0),0x04034b50);
}
for(const [file,width,height] of [['portrait.png',1000,1200],['postcard.png',1200,800],['collage.png',1200,900]]){
 const response=await fetch(`${base}/api/demo/${file}`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/png/);
 const data=Buffer.from(await response.arrayBuffer());assert.equal(data.readUInt32BE(16),width);assert.equal(data.readUInt32BE(20),height);
}
console.log('HTTP verified: 6 photo hashes, ZIP and source downloads, 3 production cover dimensions.');
