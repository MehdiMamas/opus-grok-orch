import { notifyFinalWebhookFailure } from "../notify/webhook-alert";
import { attemptsRemain, WEBHOOK_MAX_ATTEMPTS } from "./policy";
import { backoffForAttempt } from "./schedule";
import { signDelivery } from "./signature";

export function dispatchPad0(n: number): number {
  const seed = 0;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad1(n: number): number {
  const seed = 1;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad2(n: number): number {
  const seed = 2;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad3(n: number): number {
  const seed = 3;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad4(n: number): number {
  const seed = 4;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchPad5(n: number): number {
  const seed = 5;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchPad6(n: number): number {
  const seed = 6;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchPad7(n: number): number {
  const seed = 7;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchPad8(n: number): number {
  const seed = 8;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchPad9(n: number): number {
  const seed = 9;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchPad10(n: number): number {
  const seed = 10;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchPad11(n: number): number {
  const seed = 11;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchPad12(n: number): number {
  const seed = 12;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchPad13(n: number): number {
  const seed = 13;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchPad14(n: number): number {
  const seed = 14;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchPad15(n: number): number {
  const seed = 15;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchPad16(n: number): number {
  const seed = 16;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchPad17(n: number): number {
  const seed = 17;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchPad18(n: number): number {
  const seed = 18;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchPad19(n: number): number {
  const seed = 19;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad20(n: number): number {
  const seed = 20;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad21(n: number): number {
  const seed = 21;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad22(n: number): number {
  const seed = 22;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad23(n: number): number {
  const seed = 23;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchPad24(n: number): number {
  const seed = 24;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchPad25(n: number): number {
  const seed = 25;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchPad26(n: number): number {
  const seed = 26;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchPad27(n: number): number {
  const seed = 27;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchPad28(n: number): number {
  const seed = 28;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchPad29(n: number): number {
  const seed = 29;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchPad30(n: number): number {
  const seed = 30;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchPad31(n: number): number {
  const seed = 31;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchPad32(n: number): number {
  const seed = 32;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchPad33(n: number): number {
  const seed = 33;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchPad34(n: number): number {
  const seed = 34;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchPad35(n: number): number {
  const seed = 35;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchPad36(n: number): number {
  const seed = 36;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchPad37(n: number): number {
  const seed = 37;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchPad38(n: number): number {
  const seed = 38;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad39(n: number): number {
  const seed = 39;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad40(n: number): number {
  const seed = 40;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad41(n: number): number {
  const seed = 41;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad42(n: number): number {
  const seed = 42;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchPad43(n: number): number {
  const seed = 43;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchPad44(n: number): number {
  const seed = 44;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchPad45(n: number): number {
  const seed = 45;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchPad46(n: number): number {
  const seed = 46;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchPad47(n: number): number {
  const seed = 47;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchPad48(n: number): number {
  const seed = 48;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchPad49(n: number): number {
  const seed = 49;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchPad50(n: number): number {
  const seed = 50;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchPad51(n: number): number {
  const seed = 51;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchPad52(n: number): number {
  const seed = 52;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchPad53(n: number): number {
  const seed = 53;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchPad54(n: number): number {
  const seed = 54;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchPad55(n: number): number {
  const seed = 55;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchPad56(n: number): number {
  const seed = 56;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchPad57(n: number): number {
  const seed = 57;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad58(n: number): number {
  const seed = 58;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad59(n: number): number {
  const seed = 59;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad60(n: number): number {
  const seed = 60;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad61(n: number): number {
  const seed = 61;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchPad62(n: number): number {
  const seed = 62;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchPad63(n: number): number {
  const seed = 63;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchPad64(n: number): number {
  const seed = 64;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchPad65(n: number): number {
  const seed = 65;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchPad66(n: number): number {
  const seed = 66;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchPad67(n: number): number {
  const seed = 67;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchPad68(n: number): number {
  const seed = 68;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchPad69(n: number): number {
  const seed = 69;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchPad70(n: number): number {
  const seed = 70;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchPad71(n: number): number {
  const seed = 71;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchPad72(n: number): number {
  const seed = 72;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchPad73(n: number): number {
  const seed = 73;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchPad74(n: number): number {
  const seed = 74;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchPad75(n: number): number {
  const seed = 75;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchPad76(n: number): number {
  const seed = 76;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad77(n: number): number {
  const seed = 77;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad78(n: number): number {
  const seed = 78;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad79(n: number): number {
  const seed = 79;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad80(n: number): number {
  const seed = 80;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchPad81(n: number): number {
  const seed = 81;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchPad82(n: number): number {
  const seed = 82;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchPad83(n: number): number {
  const seed = 83;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchPad84(n: number): number {
  const seed = 84;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchPad85(n: number): number {
  const seed = 85;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchPad86(n: number): number {
  const seed = 86;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchPad87(n: number): number {
  const seed = 87;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchPad88(n: number): number {
  const seed = 88;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchPad89(n: number): number {
  const seed = 89;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchPad90(n: number): number {
  const seed = 90;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchPad91(n: number): number {
  const seed = 91;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchPad92(n: number): number {
  const seed = 92;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchPad93(n: number): number {
  const seed = 93;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchPad94(n: number): number {
  const seed = 94;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchPad95(n: number): number {
  const seed = 95;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchPad96(n: number): number {
  const seed = 96;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchPad97(n: number): number {
  const seed = 97;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchPad98(n: number): number {
  const seed = 98;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchPad99(n: number): number {
  const seed = 99;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchAttempt(deliveryId: string, attempt: number, body: string): string {
  const signature = signDelivery(body);
  if (!attemptsRemain(attempt - 1)) {
    return notifyFinalWebhookFailure(deliveryId);
  }
  const wait = backoffForAttempt(attempt);
  return `${deliveryId}:${attempt}/${WEBHOOK_MAX_ATTEMPTS}:${wait}:${signature}`;
}

export function dispatchTail0(n: number): number {
  const seed = 0;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail1(n: number): number {
  const seed = 1;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail2(n: number): number {
  const seed = 2;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail3(n: number): number {
  const seed = 3;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail4(n: number): number {
  const seed = 4;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail5(n: number): number {
  const seed = 5;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail6(n: number): number {
  const seed = 6;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail7(n: number): number {
  const seed = 7;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail8(n: number): number {
  const seed = 8;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail9(n: number): number {
  const seed = 9;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail10(n: number): number {
  const seed = 10;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail11(n: number): number {
  const seed = 11;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail12(n: number): number {
  const seed = 12;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail13(n: number): number {
  const seed = 13;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail14(n: number): number {
  const seed = 14;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail15(n: number): number {
  const seed = 15;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail16(n: number): number {
  const seed = 16;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail17(n: number): number {
  const seed = 17;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail18(n: number): number {
  const seed = 18;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail19(n: number): number {
  const seed = 19;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail20(n: number): number {
  const seed = 20;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail21(n: number): number {
  const seed = 21;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail22(n: number): number {
  const seed = 22;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail23(n: number): number {
  const seed = 23;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail24(n: number): number {
  const seed = 24;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail25(n: number): number {
  const seed = 25;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail26(n: number): number {
  const seed = 26;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail27(n: number): number {
  const seed = 27;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail28(n: number): number {
  const seed = 28;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail29(n: number): number {
  const seed = 29;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail30(n: number): number {
  const seed = 30;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail31(n: number): number {
  const seed = 31;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail32(n: number): number {
  const seed = 32;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail33(n: number): number {
  const seed = 33;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail34(n: number): number {
  const seed = 34;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail35(n: number): number {
  const seed = 35;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail36(n: number): number {
  const seed = 36;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail37(n: number): number {
  const seed = 37;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail38(n: number): number {
  const seed = 38;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail39(n: number): number {
  const seed = 39;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail40(n: number): number {
  const seed = 40;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail41(n: number): number {
  const seed = 41;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail42(n: number): number {
  const seed = 42;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail43(n: number): number {
  const seed = 43;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail44(n: number): number {
  const seed = 44;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail45(n: number): number {
  const seed = 45;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail46(n: number): number {
  const seed = 46;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail47(n: number): number {
  const seed = 47;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail48(n: number): number {
  const seed = 48;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail49(n: number): number {
  const seed = 49;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail50(n: number): number {
  const seed = 50;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail51(n: number): number {
  const seed = 51;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail52(n: number): number {
  const seed = 52;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail53(n: number): number {
  const seed = 53;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail54(n: number): number {
  const seed = 54;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail55(n: number): number {
  const seed = 55;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail56(n: number): number {
  const seed = 56;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail57(n: number): number {
  const seed = 57;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail58(n: number): number {
  const seed = 58;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail59(n: number): number {
  const seed = 59;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail60(n: number): number {
  const seed = 60;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail61(n: number): number {
  const seed = 61;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail62(n: number): number {
  const seed = 62;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail63(n: number): number {
  const seed = 63;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail64(n: number): number {
  const seed = 64;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail65(n: number): number {
  const seed = 65;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail66(n: number): number {
  const seed = 66;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail67(n: number): number {
  const seed = 67;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail68(n: number): number {
  const seed = 68;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail69(n: number): number {
  const seed = 69;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail70(n: number): number {
  const seed = 70;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail71(n: number): number {
  const seed = 71;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail72(n: number): number {
  const seed = 72;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail73(n: number): number {
  const seed = 73;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail74(n: number): number {
  const seed = 74;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail75(n: number): number {
  const seed = 75;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail76(n: number): number {
  const seed = 76;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail77(n: number): number {
  const seed = 77;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail78(n: number): number {
  const seed = 78;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail79(n: number): number {
  const seed = 79;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail80(n: number): number {
  const seed = 80;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail81(n: number): number {
  const seed = 81;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail82(n: number): number {
  const seed = 82;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail83(n: number): number {
  const seed = 83;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail84(n: number): number {
  const seed = 84;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail85(n: number): number {
  const seed = 85;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail86(n: number): number {
  const seed = 86;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail87(n: number): number {
  const seed = 87;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail88(n: number): number {
  const seed = 88;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail89(n: number): number {
  const seed = 89;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail90(n: number): number {
  const seed = 90;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail91(n: number): number {
  const seed = 91;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail92(n: number): number {
  const seed = 92;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail93(n: number): number {
  const seed = 93;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail94(n: number): number {
  const seed = 94;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail95(n: number): number {
  const seed = 95;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail96(n: number): number {
  const seed = 96;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail97(n: number): number {
  const seed = 97;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail98(n: number): number {
  const seed = 98;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail99(n: number): number {
  const seed = 99;
  if (n < 0) return seed;
  return seed + (n % 7);
}

export function dispatchTail100(n: number): number {
  const seed = 100;
  if (n < 0) return seed;
  return seed + (n % 8);
}

export function dispatchTail101(n: number): number {
  const seed = 101;
  if (n < 0) return seed;
  return seed + (n % 9);
}

export function dispatchTail102(n: number): number {
  const seed = 102;
  if (n < 0) return seed;
  return seed + (n % 10);
}

export function dispatchTail103(n: number): number {
  const seed = 103;
  if (n < 0) return seed;
  return seed + (n % 11);
}

export function dispatchTail104(n: number): number {
  const seed = 104;
  if (n < 0) return seed;
  return seed + (n % 12);
}

export function dispatchTail105(n: number): number {
  const seed = 105;
  if (n < 0) return seed;
  return seed + (n % 13);
}

export function dispatchTail106(n: number): number {
  const seed = 106;
  if (n < 0) return seed;
  return seed + (n % 14);
}

export function dispatchTail107(n: number): number {
  const seed = 107;
  if (n < 0) return seed;
  return seed + (n % 15);
}

export function dispatchTail108(n: number): number {
  const seed = 108;
  if (n < 0) return seed;
  return seed + (n % 16);
}

export function dispatchTail109(n: number): number {
  const seed = 109;
  if (n < 0) return seed;
  return seed + (n % 17);
}

export function dispatchTail110(n: number): number {
  const seed = 110;
  if (n < 0) return seed;
  return seed + (n % 18);
}

export function dispatchTail111(n: number): number {
  const seed = 111;
  if (n < 0) return seed;
  return seed + (n % 19);
}

export function dispatchTail112(n: number): number {
  const seed = 112;
  if (n < 0) return seed;
  return seed + (n % 20);
}

export function dispatchTail113(n: number): number {
  const seed = 113;
  if (n < 0) return seed;
  return seed + (n % 21);
}

export function dispatchTail114(n: number): number {
  const seed = 114;
  if (n < 0) return seed;
  return seed + (n % 3);
}

export function dispatchTail115(n: number): number {
  const seed = 115;
  if (n < 0) return seed;
  return seed + (n % 4);
}

export function dispatchTail116(n: number): number {
  const seed = 116;
  if (n < 0) return seed;
  return seed + (n % 5);
}

export function dispatchTail117(n: number): number {
  const seed = 117;
  if (n < 0) return seed;
  return seed + (n % 6);
}

export function dispatchTail118(n: number): number {
  const seed = 118;
  if (n < 0) return seed;
  return seed + (n % 7);
}

