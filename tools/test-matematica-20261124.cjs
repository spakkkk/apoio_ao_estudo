const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),ctx={window:{}};
const manifest=JSON.parse(read('tools/matematica-20261124-manifest.json'));
for(const [p,meta]of Object.entries(manifest)){const raw=read(p),bytes=meta.binary?raw:Buffer.from(raw.toString('utf8').replace(/\r\n?/g,'\n'));assert.equal(bytes.length,meta.bytes,p);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256,p);if(p.endsWith('.pdf'))assert.equal(bytes.subarray(0,5).toString(),'%PDF-',p);}
vm.runInNewContext(read('public/data/content.js').toString(),ctx,{timeout:3000});
vm.runInNewContext(read('public/disciplinas/matematica-a/teste-2026-11-24/matematica-data.js').toString(),ctx,{timeout:3000});
const data=ctx.window.MATEMATICA_DATA,event=ctx.window.PORTAL_DATA.subjects.find(s=>s.id==='matematica-a').events.find(e=>e.id==='teste-2026-11-24');
assert.ok(event);assert.equal(event.progressKey,'mathematics20261124');assert.equal(event.time,'08:20');assert.equal(event.date,'2026-11-24');assert.equal(data.lessons.length,22);assert.equal(data.quizzes.length,10);assert.equal(data.quizzes.reduce((n,q)=>n+q.questions.length,0),80);
assert.equal(new Set(data.lessons.map(l=>l.id)).size,22);assert.equal(new Set(data.quizzes.map(q=>q.id)).size,10);
assert.equal(JSON.stringify(event.lessonIds),JSON.stringify(data.lessons.map(l=>l.id)));assert.equal(JSON.stringify(event.quizIds),JSON.stringify(data.quizzes.map(q=>q.id)));
for(const q of data.quizzes){assert.equal(q.questions.length,8);for(const question of q.questions){assert.equal(question.points,1);if(question.type==='number')assert.ok(Number.isFinite(question.answer)&&question.tolerance>=0);else assert.ok(question.type==='mc'&&question.options[question.answer]);}}
assert.ok(read('public/disciplinas/matematica-a/teste-2026-11-24/index.html').toString().includes('matematica-app.js'));
console.log('Mathematics package passed: 22 sections, 10 quizzes, 80 questions, catalog metadata, original PDF hashes and account scope.');
