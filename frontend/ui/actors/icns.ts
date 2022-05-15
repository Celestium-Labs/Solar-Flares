import { Principal } from '@dfinity/principal';
import {
  ICNSReverseController,
} from '@psychedelic/icns-js';


const controller = new ICNSReverseController();

export async function getDomain(owner: Principal) {

  return await controller.getReverseName(owner as any);
}