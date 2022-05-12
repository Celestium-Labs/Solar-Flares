import { Principal } from "@dfinity/principal";
import { createHash } from 'crypto';

import { getCrc32 } from './crs32';

const to32bits = (num: number) => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
}

const toHexString = (byteArray: Uint8Array)  =>{
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}
export const fromHexString = (hex: string) => {
  if (hex.substr(0,2) === "0x") hex = hex.substr(2);
  for (var bytes = [], c = 0; c < hex.length; c += 2)
  bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

export const principalToAccountIdentifier = (p: string, s: number | null) => {

  const padding = new Buffer("\x0Aaccount-id");
  const array = new Uint8Array([
      ...Array.from(padding),
      ...Array.from(Principal.fromText(p).toUint8Array()),
      ...getSubAccountArray(s)
  ]);

  const shaObj = createHash('sha224');
  shaObj.update(array);
  const hash = new Uint8Array(shaObj.digest());

  const checksum = to32bits(getCrc32(hash));
  const array2 = new Uint8Array([
      ...checksum,
      ...Array.from(hash)
  ]);
  return toHexString(array2);
};

export const principalToAccountIdentifierFromSubAccountArray = (p: string, s: number[]) => {

  const padding = new Buffer("\x0Aaccount-id");
  const array = new Uint8Array([
      ...Array.from(padding),
      ...Array.from(Principal.fromText(p).toUint8Array()),
      ...s
  ]);

  const shaObj = createHash('sha224');
  shaObj.update(array);
  const hash = new Uint8Array(shaObj.digest());

  const checksum = to32bits(getCrc32(hash));
  const array2 = new Uint8Array([
      ...checksum,
      ...Array.from(hash)
  ]);
  return Array.from(array2);
};

const getSubAccountArray = (s: number | null) => {
  if (Array.isArray(s)){
    return s.concat(Array(32-s.length).fill(0));
  } else {
    //32 bit number only
    return Array(28).fill(0).concat(to32bits(s ? s : 0))
  }
};

