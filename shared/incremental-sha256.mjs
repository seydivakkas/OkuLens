/* TİCARİ-002: Akış halinde SHA-256; WebCrypto.digest'in büyük ArrayBuffer gereksinimini önler.
 * Sadece doğrulama amaçlıdır. Kriptografik güvenlik kararı Chrome crypto.subtle ile test edilmeli.
 */
const K=new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const INITIAL=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
const rotr=(v,n)=>(v>>>n)|(v<<(32-n));
export class IncrementalSHA256 {
 constructor(){this.h=new Uint32Array(INITIAL);this.buffer=new Uint8Array(64);this.pending=0;this.size=0;this.done=false;this.w=new Uint32Array(64);}
 _block(){
  const w=this.w,b=this.buffer,h=this.h;
  for(let i=0;i<16;i++)w[i]=((b[4*i]<<24)|(b[4*i+1]<<16)|(b[4*i+2]<<8)|b[4*i+3])>>>0;
  for(let i=16;i<64;i++){
   const a=w[i-15],z=w[i-2],s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(z,17)^rotr(z,19)^(z>>>10);
   w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
  }
  let [a,b1,c,d,e,f,g,hh]=h;
  for(let i=0;i<64;i++){
   const s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g);
   const t1=(hh+s1+ch+K[i]+w[i])>>>0;
   const s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b1)^(a&c)^(b1&c);
   const t2=(s0+maj)>>>0;
   hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b1;b1=a;a=(t1+t2)>>>0;
  }
  for(let i=0;i<8;i++)h[i]=(h[i]+[a,b1,c,d,e,f,g,hh][i])>>>0;
 }
 update(data){
  if(this.done)throw new Error('HASH_FINALIZED');
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  this.size+=bytes.length;
  if(!Number.isSafeInteger(this.size)||this.size>Number.MAX_SAFE_INTEGER/8)throw new RangeError('HASH_TOO_LARGE');
  let offset=0;
  while(offset<bytes.length){
   const take=Math.min(64-this.pending,bytes.length-offset);
   this.buffer.set(bytes.subarray(offset,offset+take),this.pending);
   this.pending+=take;offset+=take;
   if(this.pending===64){this._block();this.pending=0;}
  }
  return this;
 }
 digestHex(){
  if(this.done)throw new Error('HASH_FINALIZED');this.done=true;
  const bitLength=BigInt(this.size)*8n;
  this.buffer[this.pending++]=0x80;
  if(this.pending>56){this.buffer.fill(0,this.pending);this._block();this.pending=0;}
  this.buffer.fill(0,this.pending,56);
  for(let i=0;i<8;i++)this.buffer[56+i]=Number((bitLength>>BigInt((7-i)*8))&255n);
  this._block();
  return [...this.h].map(x=>x.toString(16).padStart(8,'0')).join('');
 }
}
