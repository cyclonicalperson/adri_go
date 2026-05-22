const COUNTRY_CODES = `
AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW XK
`.trim().split(/\s+/);

const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  BO: 'Bolivia',
  CD: 'Democratic Republic of the Congo',
  CG: 'Republic of the Congo',
  CI: 'Ivory Coast',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  IR: 'Iran',
  KP: 'North Korea',
  KR: 'South Korea',
  LA: 'Laos',
  MD: 'Moldova',
  MK: 'North Macedonia',
  PS: 'Palestine',
  RU: 'Russia',
  SY: 'Syria',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  US: 'United States',
  VA: 'Vatican City',
  VE: 'Venezuela',
  VN: 'Vietnam',
  XK: 'Kosovo',
};

const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

export const WORLD_COUNTRIES: string[] = COUNTRY_CODES
  .map(code => COUNTRY_NAME_OVERRIDES[code] ?? displayNames?.of(code) ?? code)
  .filter((name, index, all) => all.indexOf(name) === index)
  .sort((a, b) => a.localeCompare(b));

export const DEFAULT_COUNTRY = 'Montenegro';

