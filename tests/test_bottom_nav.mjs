import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('style.css'),app=read('app.js'),html=read('index.html');

assert.match(css,/#appShell\{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden\}/);
assert.match(css,/body\{margin:0;overflow:hidden/);
assert.match(css,/main\{[^}]*flex:1 1 auto;min-height:0;overflow-y:auto/);
assert.match(css,/\.bottom-nav\{position:relative;[^}]*flex:0 0 auto/);
assert.doesNotMatch(css,/\.bottom-nav\{position:fixed/);
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.match(app,/\$\('mainContent'\)\?\.scrollTo\?\.\(\{top:0,left:0,behavior:'auto'\}\)/);
const mainEnd=html.indexOf('</main>');
const nav=html.indexOf('<nav class="bottom-nav">');
const shellEnd=html.indexOf('</div><section id="exitScreen"');
assert.ok(mainEnd>=0&&nav>mainEnd&&shellEnd>nav,'bottom nav must live inside appShell after main');
console.log('App-shell bottom-navigation layout tests passed');
