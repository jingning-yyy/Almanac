/* ============================================================
 * 农历 / 干支 / 节气 计算库（基于开源 solarlunar，1900-2100）
 * 原作：JJonline (calendar.js)，Modernized 版本
 * 本文件暴露全局常量 solarLunar，供 js/calendar.js 使用
 * ============================================================ */
"use strict";

const lunarInfo = [0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, //1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, //1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, //1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, //1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, //1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, //1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, //1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, //1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, //1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, //1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, //2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, //2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, //2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, //2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, //2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, //2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, //2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, //2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, //2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, //2090-2099
  0x0d520]; //2100

const solarMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const gan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const animals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

const lunarTerm = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];

const lTermInfo = [
  "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e", "97bcf97c3598082c95f8c965cc920f",
  "97bd0b06bdb0722c965ce1cfcc920f", "b027097bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e",
  "97bcf97c359801ec95f8c965cc920f", "97bd0b06bdb0722c965ce1cfcc920f", "b027097bd097c36b0b6fc9274c91aa",
  "97b6b97bd19801ec9210c965cc920e", "97bcf97c359801ec95f8c965cc920f", "97bd0b06bdb0722c965ce1cfcc920f",
  "b027097bd097c36b0b6fc9274c91aa", "9778397bd19801ec9210c965cc920e", "97b6b97bd19801ec95f8c965cc920f",
  "97bd09801d98082c95f8e1cfcc920f", "97bd097bd097c36b0b6fc9210c8dc2", "9778397bd197c36c9210c9274c91aa",
  "97b6b97bd19801ec95f8c965cc920e", "97bd09801d98082c95f8e1cfcc920f", "97bd097bd097c36b0b6fc9210c8dc2",
  "9778397bd097c36c9210c9274c91aa", "97b6b97bd19801ec95f8c965cc920e", "97bcf97c3598082c95f8e1cfcc920f",
  "97bd097bd097c36b0b6fc9210c8dc2", "9778397bd097c36c9210c9274c91aa", "97b6b97bd19801ec9210c965cc920e",
  "97bcf97c3598082c95f8c965cc920f", "97bd097bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b97bd19801ec9210c965cc920e", "97bcf97c3598082c95f8c965cc920f", "97bd097bd097c35b0b6fc920fb0722",
  "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e", "97bcf97c359801ec95f8c965cc920f",
  "97bd097bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e",
  "97bcf97c359801ec95f8c965cc920f", "97bd097bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b97bd19801ec9210c965cc920e", "97bcf97c359801ec95f8c965cc920f", "97bd097bd07f595b0b6fc920fb0722",
  "9778397bd097c36b0b6fc9210c8dc2", "9778397bd19801ec9210c9274c920e", "97b6b97bd19801ec95f8c965cc920f",
  "97bd07f5307f595b0b0bc920fb0722", "7f0e397bd097c36b0b6fc9210c8dc2", "9778397bd097c36c9210c9274c920e",
  "97b6b97bd19801ec95f8c965cc920f", "97bd07f5307f595b0b0bc920fb0722", "7f0e397bd097c36b0b6fc9210c8dc2",
  "9778397bd097c36c9210c9274c91aa", "97b6b97bd19801ec9210c965cc920e", "97bd07f1487f595b0b0bc920fb0722",
  "7f0e397bd097c36b0b6fc9210c8dc2", "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e",
  "97bcf7f1487f595b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b97bd19801ec9210c965cc920e", "97bcf7f1487f595b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722",
  "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e", "97bcf7f1487f531b0b0bb0b6fb0722",
  "7f0e397bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa", "97b6b97bd19801ec9210c965cc920e",
  "97bcf7f1487f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b97bd19801ec9210c9274c920e", "97bcf7f0e47f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b0bc920fb0722",
  "9778397bd097c36b0b6fc9210c91aa", "97b6b97bd197c36c9210c9274c920e", "97bcf7f0e47f531b0b0bb0b6fb0722",
  "7f0e397bd07f595b0b0bc920fb0722", "9778397bd097c36b0b6fc9210c8dc2", "9778397bd097c36c9210c9274c920e",
  "97b6b7f0e47f531b0723b0b6fb0722", "7f0e37f5307f595b0b0bc920fb0722", "7f0e397bd097c36b0b6fc9210c8dc2",
  "9778397bd097c36b0b70c9274c91aa", "97b6b7f0e47f531b0723b0b6fb0721", "7f0e37f1487f595b0b0bb0b6fb0722",
  "7f0e397bd097c35b0b6fc9210c8dc2", "9778397bd097c36b0b6fc9274c91aa", "97b6b7f0e47f531b0723b0b6fb0721",
  "7f0e27f1487f595b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722",
  "9778397bd097c36b0b6fc9274c91aa", "97b6b7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722",
  "7f0e397bd097c35b0b6fc920fb0722", "9778397bd097c36b0b6fc9274c91aa", "97b6b7f0e47f531b0723b0b6fb0721",
  "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b0bc920fb0722", "9778397bd097c36b0b6fc9274c91aa",
  "97b6b7f0e47f531b0723b0787b0721", "7f0e27f0e47f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b0bc920fb0722",
  "9778397bd097c36b0b6fc9210c91aa", "97b6b7f0e47f149b0723b0787b0721", "7f0e27f0e47f531b0723b0b6fb0722",
  "7f0e397bd07f595b0b0bc920fb0722", "9778397bd097c36b0b6fc9210c8dc2", "977837f0e37f149b0723b0787b0721",
  "7f07e7f0e47f531b0723b0b6fb0722", "7f0e37f5307f595b0b0bc920fb0722", "7f0e397bd097c35b0b6fc9210c8dc2",
  "977837f0e37f14998082b0787b0721", "7f07e7f0e47f531b0723b0b6fb0721", "7f0e37f1487f595b0b0bb0b6fb0722",
  "7f0e397bd097c35b0b6fc9210c8dc2", "977837f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721",
  "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722", "977837f0e37f14998082b0787b06bd",
  "7f07e7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e397bd097c35b0b6fc920fb0722",
  "977837f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722",
  "7f0e397bd07f595b0b0bc920fb0722", "977837f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721",
  "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b0bc920fb0722", "977837f0e37f14998082b0787b06bd",
  "7f07e7f0e47f149b0723b0787b0721", "7f0e27f0e47f531b0b0bb0b6fb0722", "7f0e397bd07f595b0b0bc920fb0722",
  "977837f0e37f14998082b0723b06bd", "7f07e7f0e37f149b0723b0787b0721", "7f0e27f0e47f531b0723b0b6fb0722",
  "7f0e397bd07f595b0b0bc920fb0722", "977837f0e37f14898082b0723b02d5", "7ec967f0e37f14998082b0787b0721",
  "7f07e7f0e47f531b0723b0b6fb0722", "7f0e37f1487f595b0b0bb0b6fb0722", "7f0e37f0e37f14898082b0723b02d5",
  "7ec967f0e37f14998082b0787b0721", "7f07e7f0e47f531b0723b0b6fb0722", "7f0e37f1487f531b0b0bb0b6fb0722",
  "7f0e37f0e37f14898082b0723b02d5", "7ec967f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721",
  "7f0e37f1487f531b0b0bb0b6fb0722", "7f0e37f0e37f14898082b072297c35", "7ec967f0e37f14998082b0787b06bd",
  "7f07e7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e37f0e37f14898082b072297c35",
  "7ec967f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722",
  "7f0e37f0e366aa89801eb072297c35", "7ec967f0e37f14998082b0787b06bd", "7f07e7f0e47f149b0723b0787b0721",
  "7f0e27f1487f531b0b0bb0b6fb0722", "7f0e37f0e366aa89801eb072297c35", "7ec967f0e37f14998082b0723b06bd",
  "7f07e7f0e47f149b0723b0787b0721", "7f0e27f0e47f531b0723b0b6fb0722", "7f0e37f0e366aa89801eb072297c35",
  "7ec967f0e37f14998082b0723b06bd", "7f07e7f0e37f14998083b0787b0721", "7f0e27f0e47f531b0723b0b6fb0722",
  "7f0e37f0e366aa89801eb072297c35", "7ec967f0e37f14898082b0723b02d5", "7f07e7f0e37f14998082b0787b0721",
  "7f07e7f0e47f531b0723b0b6fb0722", "7f0e36665b66aa89801e9808297c35", "665f67f0e37f14898082b0723b02d5",
  "7ec967f0e37f14998082b0787b0721", "7f07e7f0e47f531b0723b0b6fb0722", "7f0e36665b66a449801e9808297c35",
  "665f67f0e37f14898082b0723b02d5", "7ec967f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721",
  "7f0e36665b66a449801e9808297c35", "665f67f0e37f14898082b072297c35", "7ec967f0e37f14998082b0787b06bd",
  "7f07e7f0e47f531b0723b0b6fb0721", "7f0e26665b66a449801e9808297c35", "665f67f0e37f1489801eb072297c35",
  "7ec967f0e37f14998082b0787b06bd", "7f07e7f0e47f531b0723b0b6fb0721", "7f0e27f1487f531b0b0bb0b6fb0722"
];

const nStr1 = ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const nStr2 = ["初", "十", "廿", "卅"];
const nStr3 = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const nStr4 = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

const solarLunar = {
  lunarInfo, solarMonth, gan, zhi, animals, lunarTerm, lTermInfo, nStr1, nStr2, nStr3, nStr4,

  lYearDays(y) {
    let sum = 348;
    const info = lunarInfo[y - 1900];
    for (let b = 0x8000; b >= 0x10; b >>= 1) sum += (info & b) ? 1 : 0;
    return sum + solarLunar.leapDays(y);
  },

  leapMonth(y) { return lunarInfo[y - 1900] & 0xf; },

  leapDays(y) {
    return solarLunar.leapMonth(y) ? (lunarInfo[y - 1900] & 0x10000 ? 30 : 29) : 0;
  },

  monthDays(y, m) {
    if (m > 12 || m < 1) return -1;
    return lunarInfo[y - 1900] & (0x10000 >> m) ? 30 : 29;
  },

  solarDays(y, m) {
    if (m > 12 || m < 1) return -1;
    if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
    return solarMonth[m - 1];
  },

  toGanZhi(offset) { return gan[offset % 10] + zhi[offset % 12]; },

  /* 该公历年第 n 个节气（n=1 小寒 … 24 冬至）落在当月几号 */
  getTerm(y, n) {
    if (y < 1900 || y > 2100 || n < 1 || n > 24) return -1;
    const t = lTermInfo[y - 1900];
    const info = [];
    for (let i = 0; i < 6; i++) info.push(parseInt("0x" + t.substr(i * 5, 5)).toString());
    const calDay = [];
    for (let i = 0; i < 6; i++) {
      calDay.push(info[i].substr(0, 1), info[i].substr(1, 2), info[i].substr(3, 1), info[i].substr(4, 2));
    }
    return parseInt(calDay[n - 1]);
  },

  toChinaYear(y) {
    return nStr4[Math.floor(y / 1000)] + nStr4[Math.floor((y % 1000) / 100)] +
      nStr4[Math.floor((y % 100) / 10)] + nStr4[y % 10] + "年";
  },

  toChinaMonth(m) { return m > 12 || m < 1 ? -1 : nStr3[m - 1] + "月"; },

  toChinaDay(d) {
    switch (d) {
      case 10: return "初十";
      case 20: return "二十";
      case 30: return "三十";
      default: return nStr2[Math.floor(d / 10)] + nStr1[d % 10];
    }
  },

  getAnimal(y, m, d) {
    if (m !== undefined && d !== undefined) {
      const term3 = solarLunar.getTerm(y, 3);
      if (m < 2 || (m === 2 && d < term3)) y -= 1;
    }
    return animals[(y - 4) % 12];
  },

  /* 公历转农历：返回公历、农历、干支、节气等完整信息 */
  solar2lunar(y, m, d) {
    if (y == null || m == null || d == null) {
      const t = new Date();
      y = t.getFullYear(); m = t.getMonth() + 1; d = t.getDate();
    }
    y = Number(y); m = Number(m); d = Number(d);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return -1;
    if (y < 1900 || y > 2100) return -1;
    if (y === 1900 && m === 1 && d < 31) return -1;
    if (m < 1 || m > 12) return -1;
    if (d < 1 || d > solarLunar.solarDays(y, m)) return -1;

    const objDate = new Date(y, m - 1, d);
    let i, temp = 0;
    y = objDate.getFullYear(); m = objDate.getMonth() + 1; d = objDate.getDate();
    let offset = (Date.UTC(objDate.getFullYear(), objDate.getMonth(), objDate.getDate()) -
      Date.UTC(1900, 0, 31)) / 86400000;

    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = solarLunar.lYearDays(i);
      offset -= temp;
    }
    if (offset < 0) { offset += temp; i--; }

    const year = i;
    const leapMonth = solarLunar.leapMonth(year);
    let isLeap = false;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leapMonth > 0 && i === leapMonth + 1 && isLeap === false) {
        --i;
        isLeap = true;
        temp = solarLunar.leapDays(year);
      } else {
        temp = solarLunar.monthDays(year, i);
      }
      if (isLeap === true && i === leapMonth + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leapMonth > 0 && i === leapMonth + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; --i; }
    const month = i;
    const day = offset + 1;

    const nWeek = objDate.getDay();
    const cWeek = nStr1[nWeek];

    const sm = m - 1;
    const term3 = solarLunar.getTerm(y, 3);
    let gzY = solarLunar.toGanZhi(y - 4);
    if (m < 2 || (m === 2 && d < term3)) gzY = solarLunar.toGanZhi(y - 1 - 4);

    const firstNode = solarLunar.getTerm(y, m * 2 - 1);
    const secondNode = solarLunar.getTerm(y, m * 2);
    let gzM = solarLunar.toGanZhi((y - 1900) * 12 + m + 11);
    if (d >= firstNode) gzM = solarLunar.toGanZhi((y - 1900) * 12 + m + 12);

    let isTerm = false, term = "";
    if (firstNode === d) { isTerm = true; term = lunarTerm[m * 2 - 2]; }
    if (secondNode === d) { isTerm = true; term = lunarTerm[m * 2 - 1]; }

    const dayCyclical = Date.UTC(y, sm, 1, 0, 0, 0, 0) / 86400000 + 25567 + 10;
    const gzD = solarLunar.toGanZhi(dayCyclical + d - 1);

    return {
      lYear: year, lMonth: month, lDay: day,
      animal: solarLunar.getAnimal(year),
      yearCn: solarLunar.toChinaYear(year),
      monthCn: (isLeap && leapMonth === month ? "闰" : "") + solarLunar.toChinaMonth(month),
      dayCn: solarLunar.toChinaDay(day),
      cYear: y, cMonth: m, cDay: d,
      gzYear: gzY, gzMonth: gzM, gzDay: gzD,
      isLeap, nWeek: nWeek === 0 ? 7 : nWeek,
      ncWeek: "星期" + cWeek,
      isTerm, term
    };
  },

  /* 农历转公历：传入农历年月日（isLeapMonth 标记闰月），返回含公历信息的对象 */
  lunar2solar(y, m, d, isLeapMonth) {
    y = Number(y); m = Number(m); d = Number(d);
    isLeapMonth = Boolean(isLeapMonth);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return -1;
    const leapMonth = solarLunar.leapMonth(y);
    if (isLeapMonth && leapMonth !== m) return -1;
    if ((y === 2100 && m === 12 && d > 1) || (y === 1900 && m === 1 && d < 31)) return -1;
    const day = solarLunar.monthDays(y, m);
    if (y < 1900 || y > 2100 || d > day) return -1;

    let offset = 0;
    for (let i = 1900; i < y; i++) offset += solarLunar.lYearDays(i);
    let leap = 0, isAdd = false;
    for (let i = 1; i < m; i++) {
      leap = solarLunar.leapMonth(y);
      if (!isAdd) {
        if (leap <= i && leap > 0) {
          offset += solarLunar.leapDays(y);
          isAdd = true;
        }
      }
      offset += solarLunar.monthDays(y, i);
    }
    if (isLeapMonth) offset += day;
    const stmap = Date.UTC(1900, 1, 30, 0, 0, 0);
    const calObj = new Date((offset + d - 31) * 86400000 + stmap);
    return solarLunar.solar2lunar(calObj.getUTCFullYear(), calObj.getUTCMonth() + 1, calObj.getUTCDate());
  }
};
