import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", defaultViewport:{width:1300,height:900,deviceScaleFactor:2}, args:["--no-sandbox","--hide-scrollbars"] });
const p = await b.newPage();
// count network requests to the trpc endpoint over the first 3s
let reqs=0; p.on("request", r => { if(r.url().includes("/api/trpc")) reqs++; });
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded",timeout:60000});
await new Promise(r=>setTimeout(r,3000));
console.log("trpc batch requests in first 3s:", reqs);
// click 1D and capture the chart's x-axis (should be a single day)
await p.waitForFunction(()=>document.querySelector(".recharts-wrapper"),{timeout:20000}).catch(()=>{});
await p.evaluate(()=>{const d=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="1D"); d&&d.click();});
await new Promise(r=>setTimeout(r,4000));
const el=await p.$(".recharts-wrapper");
if(el) await el.screenshot({path:"/tmp/perf_1d.png"});
console.log("saved");
await b.close();
